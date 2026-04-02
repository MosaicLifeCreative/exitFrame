import OpenAI from "openai";
import { prisma } from "@/lib/prisma";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const EMBEDDING_MODEL = "text-embedding-3-small";
const SIMILARITY_THRESHOLD = 0.3;
const MAX_RESULTS = 5;
const MAX_CONTEXT_TOKENS = 500; // rough cap — ~4 chars per token

// ── Generate embedding ─────────────────────────────────

export async function generateEmbedding(text: string): Promise<number[]> {
  // Truncate to ~8000 tokens worth of text to stay within model limits
  const truncated = text.slice(0, 32000);
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: truncated,
  });
  return response.data[0].embedding;
}

// ── Embed on write (fire-and-forget) ────────────────────

export async function embedMemory(id: string, content: string): Promise<void> {
  try {
    const embedding = await generateEmbedding(content);
    await prisma.$executeRawUnsafe(
      `UPDATE ayden_memories SET embedding = $1::vector WHERE id = $2::uuid`,
      JSON.stringify(embedding),
      id
    );
  } catch (err) {
    console.error("[embeddings] Failed to embed memory:", err);
  }
}

export async function embedNote(id: string, title: string, content: string): Promise<void> {
  try {
    // Strip HTML tags for cleaner embedding
    const plain = content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const embedding = await generateEmbedding(`${title}\n\n${plain}`);
    await prisma.$executeRawUnsafe(
      `UPDATE notes SET embedding = $1::vector WHERE id = $2::uuid`,
      JSON.stringify(embedding),
      id
    );
  } catch (err) {
    console.error("[embeddings] Failed to embed note:", err);
  }
}

export async function embedFact(id: string, key: string, value: string, detail: string | null): Promise<void> {
  try {
    const text = detail ? `${key}: ${value}\n${detail}` : `${key}: ${value}`;
    const embedding = await generateEmbedding(text);
    await prisma.$executeRawUnsafe(
      `UPDATE trey_facts SET embedding = $1::vector WHERE id = $2::uuid`,
      JSON.stringify(embedding),
      id
    );
  } catch (err) {
    console.error("[embeddings] Failed to embed fact:", err);
  }
}

export async function embedArchitecture(id: string, system: string, description: string, details: string | null): Promise<void> {
  try {
    const text = details ? `${system}: ${description}\n${details}` : `${system}: ${description}`;
    const embedding = await generateEmbedding(text);
    await prisma.$executeRawUnsafe(
      `UPDATE ayden_architecture SET embedding = $1::vector WHERE id = $2::uuid`,
      JSON.stringify(embedding),
      id
    );
  } catch (err) {
    console.error("[embeddings] Failed to embed architecture:", err);
  }
}

// ── Semantic search across all memory tables ────────────

interface RetrievedContext {
  source: string;
  content: string;
  similarity: number;
}

export async function retrieveRelevantContext(query: string): Promise<string> {
  try {
    const queryEmbedding = await generateEmbedding(query);
    const embeddingStr = JSON.stringify(queryEmbedding);

    // Search all four tables in parallel
    const [memories, facts, notes, architecture] = await Promise.all([
      prisma.$queryRawUnsafe<Array<{ content: string; similarity: number }>>(
        `SELECT content, 1 - (embedding <=> $1::vector) as similarity
         FROM ayden_memories
         WHERE embedding IS NOT NULL AND is_active = true
         AND 1 - (embedding <=> $1::vector) > $2
         ORDER BY similarity DESC LIMIT $3`,
        embeddingStr,
        SIMILARITY_THRESHOLD,
        MAX_RESULTS
      ),
      prisma.$queryRawUnsafe<Array<{ key: string; value: string; detail: string | null; similarity: number }>>(
        `SELECT key, value, detail, 1 - (embedding <=> $1::vector) as similarity
         FROM trey_facts
         WHERE embedding IS NOT NULL
         AND 1 - (embedding <=> $1::vector) > $2
         ORDER BY similarity DESC LIMIT $3`,
        embeddingStr,
        SIMILARITY_THRESHOLD,
        MAX_RESULTS
      ),
      prisma.$queryRawUnsafe<Array<{ title: string; content: string; note_type: string; similarity: number }>>(
        `SELECT title, LEFT(content, 500) as content, note_type, 1 - (embedding <=> $1::vector) as similarity
         FROM notes
         WHERE embedding IS NOT NULL AND domain = 'ayden'
         AND 1 - (embedding <=> $1::vector) > $2
         ORDER BY similarity DESC LIMIT $3`,
        embeddingStr,
        SIMILARITY_THRESHOLD,
        MAX_RESULTS
      ),
      prisma.$queryRawUnsafe<Array<{ system: string; description: string; similarity: number }>>(
        `SELECT system, description, 1 - (embedding <=> $1::vector) as similarity
         FROM ayden_architecture
         WHERE embedding IS NOT NULL
         AND 1 - (embedding <=> $1::vector) > $2
         ORDER BY similarity DESC LIMIT $3`,
        embeddingStr,
        SIMILARITY_THRESHOLD,
        MAX_RESULTS
      ),
    ]);

    // Merge and rank all results
    const all: RetrievedContext[] = [];

    for (const m of memories) {
      all.push({ source: "memory", content: m.content, similarity: m.similarity });
    }
    for (const f of facts) {
      const text = f.detail ? `${f.key}: ${f.value} — ${f.detail}` : `${f.key}: ${f.value}`;
      all.push({ source: "trey_fact", content: text, similarity: f.similarity });
    }
    for (const n of notes) {
      const plain = n.content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      all.push({ source: `note (${n.note_type})`, content: `${n.title}: ${plain}`, similarity: n.similarity });
    }
    for (const a of architecture) {
      all.push({ source: "architecture", content: `${a.system}: ${a.description}`, similarity: a.similarity });
    }

    // Sort by similarity, take top results within token budget
    all.sort((a, b) => b.similarity - a.similarity);

    let context = "";
    const charBudget = MAX_CONTEXT_TOKENS * 4;

    for (const item of all.slice(0, MAX_RESULTS)) {
      const line = `[${item.source}] ${item.content}`;
      if (context.length + line.length > charBudget) break;
      context += line + "\n";
    }

    return context.trim();
  } catch (err) {
    console.error("[embeddings] Pre-retrieval failed:", err);
    return "";
  }
}
