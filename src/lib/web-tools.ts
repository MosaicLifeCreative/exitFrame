import Anthropic from "@anthropic-ai/sdk";
import * as cheerio from "cheerio";

export const webTools: Anthropic.Tool[] = [
  {
    name: "web_search",
    description:
      "Search the internet using Brave Search. Use this when you need current information — stock news, weather, product research, current events, fact-checking, looking up people/companies, or anything you don't already know. Returns web results with titles, descriptions, and URLs. You can then use fetch_url to read the full content of any result.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "The search query",
        },
        count: {
          type: "number",
          description: "Number of results to return (default 5, max 10)",
        },
        freshness: {
          type: "string",
          description: "Filter by freshness: 'pd' (past day), 'pw' (past week), 'pm' (past month). Omit for no time filter.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "fetch_url",
    description:
      "Fetch a URL and extract its readable text content. Use this when the user shares a link or asks you to read a webpage, article, swim meet results, product page, documentation, etc.",
    input_schema: {
      type: "object" as const,
      properties: {
        url: {
          type: "string",
          description: "The full URL to fetch (must start with http:// or https://)",
        },
        selector: {
          type: "string",
          description:
            "Optional CSS selector to extract specific content (e.g. 'article', 'main', '.results-table'). If omitted, extracts the full page body.",
        },
      },
      required: ["url"],
    },
  },
];

interface WebSearchInput {
  query: string;
  count?: number;
  freshness?: string;
}

interface FetchUrlInput {
  url: string;
  selector?: string;
}

const MAX_CONTENT_LENGTH = 6000; // chars to return to Claude

async function webSearch(input: WebSearchInput): Promise<string> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) {
    return JSON.stringify({ error: "Web search is not configured (BRAVE_SEARCH_API_KEY missing)" });
  }

  const count = Math.min(input.count || 5, 10);
  const params = new URLSearchParams({
    q: input.query,
    count: String(count),
  });
  if (input.freshness) {
    params.set("freshness", input.freshness);
  }

  try {
    const res = await fetch(`https://api.search.brave.com/res/v1/web/search?${params}`, {
      headers: {
        "Accept": "application/json",
        "Accept-Encoding": "gzip",
        "X-Subscription-Token": apiKey,
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      return JSON.stringify({ error: `Brave Search API error: HTTP ${res.status}` });
    }

    const data = await res.json();
    const results = (data.web?.results || []).slice(0, count);

    if (results.length === 0) {
      return JSON.stringify({ query: input.query, results: [], message: "No results found" });
    }

    const formatted = results.map((r: { title: string; url: string; description?: string; age?: string }) => ({
      title: r.title,
      url: r.url,
      description: r.description?.slice(0, 200),
      age: r.age,
    }));

    return JSON.stringify({ query: input.query, results: formatted });
  } catch (err) {
    if (err instanceof DOMException && err.name === "TimeoutError") {
      return JSON.stringify({ error: "Search timed out after 8 seconds" });
    }
    const msg = err instanceof Error ? err.message : "Unknown search error";
    return JSON.stringify({ error: msg });
  }
}

async function fetchUrl(input: FetchUrlInput): Promise<string> {
  const { url, selector } = input;

  // Basic URL validation
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return JSON.stringify({ error: "URL must start with http:// or https://" });
  }

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; MosaicLife/1.0)",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    if (!response.ok) {
      return JSON.stringify({ error: `HTTP ${response.status}: ${response.statusText}` });
    }

    const contentType = response.headers.get("content-type") || "";

    // Handle JSON responses directly
    if (contentType.includes("application/json")) {
      const json = await response.text();
      const truncated = json.slice(0, MAX_CONTENT_LENGTH);
      return JSON.stringify({
        success: true,
        url,
        contentType: "json",
        content: truncated,
        truncated: json.length > MAX_CONTENT_LENGTH,
      });
    }

    // Handle plain text
    if (contentType.includes("text/plain")) {
      const text = await response.text();
      const truncated = text.slice(0, MAX_CONTENT_LENGTH);
      return JSON.stringify({
        success: true,
        url,
        contentType: "text",
        content: truncated,
        truncated: text.length > MAX_CONTENT_LENGTH,
      });
    }

    // HTML — parse with cheerio
    const html = await response.text();
    const $ = cheerio.load(html);

    // Remove non-content elements
    $("script, style, nav, footer, header, noscript, iframe, svg").remove();

    let text: string;
    if (selector) {
      const selected = $(selector);
      if (selected.length === 0) {
        return JSON.stringify({
          error: `CSS selector "${selector}" matched no elements. Try a broader selector or omit it.`,
        });
      }
      text = selected.text();
    } else {
      // Try common article selectors first, fall back to body
      const article = $("article, main, [role='main'], .content, .post-content, .entry-content");
      text = article.length > 0 ? article.first().text() : $("body").text();
    }

    // Clean up whitespace
    const cleaned = text
      .replace(/\s+/g, " ")
      .replace(/\n\s*\n/g, "\n")
      .trim();

    const title = $("title").text().trim();
    const truncated = cleaned.slice(0, MAX_CONTENT_LENGTH);

    return JSON.stringify({
      success: true,
      url,
      title: title || undefined,
      contentType: "html",
      content: truncated,
      truncated: cleaned.length > MAX_CONTENT_LENGTH,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "TimeoutError") {
      return JSON.stringify({ error: "Request timed out after 10 seconds" });
    }
    const msg = err instanceof Error ? err.message : "Unknown fetch error";
    return JSON.stringify({ error: msg });
  }
}

export async function executeWebTool(
  toolName: string,
  toolInput: Record<string, unknown>
): Promise<string> {
  switch (toolName) {
    case "web_search":
      return webSearch(toolInput as unknown as WebSearchInput);
    case "fetch_url":
      return fetchUrl(toolInput as unknown as FetchUrlInput);
    default:
      return JSON.stringify({ error: `Unknown web tool: ${toolName}` });
  }
}
