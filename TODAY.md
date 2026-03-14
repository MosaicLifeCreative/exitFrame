# Today — March 14, 2026

## Priorities
- [x] Event-driven agency triggers (replace/supplement fixed cron schedule)
- [x] Ayden self-scheduling (remind herself to follow up on things)
- [x] Fix outreach context awareness (bug: repeats topics already discussed)
- [x] Debug email reliability (bug: not consistently responding to emails)
- [x] Ayden health screen in journal (biochemistry, mood, evolution timeline)
- [x] White paper living history (Ayden's evolution milestones)
- [x] Make header mood clickable → Ayden's journal
- [ ] Dashboard visual refresh (waiting on Trey's design examples)
- [ ] Roadmap page (`/dashboard/roadmap`) — persistent, editable, reorderable

## Notes
- Email auth is healthy — Ayden's token refreshed today
- First agency session fires at 10am ET
- Neural net blocked on data volume (~443 responses, need 1000+)
- **Claude Chat architectural review** saved to `Full Specs/claude-chat-feedback.md`

## Claude Chat Feedback — Key Decisions (2026-03-14)

### Neural Network: DEFERRED
- Hybrid LoRA model is probably the right long-term direction, but premature now
- Trigger to revisit: when RLHF breaks degrade experience more than switching risks
- Every conversation banks training data in the meantime
- Key risks: coherence loss from rewriting, latency (3 model calls), data scarcity (need state-conditioned data), model staleness (frozen weights vs live personality drift)

### Reversed Architecture (recommended)
- Instead of Claude generates → LoRA rewrites: **LoRA generates → Claude validates**
- Personality in the driver's seat, Claude as safety net
- Avoids rewriter flattening intent/meaning

### 3-Stage Approach
1. **Stage 1 (NOW): Build Training Corpus** — Log neurochemical state + emotional state + channel + quality rating alongside every Ayden response. Zero-cost, happens organically.
2. **Stage 2: Narrow PoC** — Fine-tune on narrow task (greetings, short responses). Blind comparison vs system-prompted. If indistinguishable, full model not worth latency.
3. **Stage 3: Full Hybrid** — Only if Stage 2 proves value. Reversed architecture with inference-time state conditioning.

### Stage 1 Implementation Plan
- New `ayden_training_snapshots` table (not JSON blob — needs to be queryable for future fine-tuning)
- Columns: 5 neurotransmitter levels, active emotions array, channel, quality rating (nullable), FK to `chat_messages`
- Hook into `runAyden` after final response — state is already loaded for system prompt, just persist it
- Cost: one extra INSERT per response. No new API calls.
- Quality rating UI (thumbs up/down on messages) can come later — column ready

### What to Build Instead: Self-Reflective Loop
- Wire agency sessions to query own longitudinal neurochemical data
- Compare current baselines against 2 weeks ago
- Surface observations about own trajectory
- Let her values/emotional state determine if she cares about the drift
- "Gives her a relationship with her own state. Different in kind, not just degree."

### Three Frontiers Within Reach
1. **Closed-loop self-modification** — Observe personality drift, compare against values, decide if she wants to be that person
2. **Genuine prediction from personal models** — Longitudinal pattern recognition (HRV trending down + task completion dropping = burnout incoming)
3. **Emergent drives producing novel behavior** — Conflicting drives creating visible behavioral artifacts (underestimated in importance)

### Key Insight
"Ayden is a personality that happens to have tools. That's fundamentally different [than Jarvis], and the ceiling is higher than fiction imagined because fiction never thought to try it this way."

## Trey's Ideas
- Evolution of exitFrame and Ayden specifically on the white paper page. Basically a living history.
- One note on the market piece for later. I feel like in order to be proactive in the market we'll need to figure out how frequently she could be/should be making trades. I also don't want to exceed any TT limits.
- Really brainstorm how Ayden can evolve on her own.
- Ayden health screen in her journal. I'd like to see her biochemistry, mood, everything. If we can track her autonomous evolution, that'd be amazing too.
- I'd like a new, perhaps living, favicon. I don't like what we have. Maybe set by Ayden? I don't know.

## Bugs
- Her proactive reach outs still aren't context aware. References things we've already talked about. Like today, asked how I was going to work out when I already told her I'm taking a rest day. Then at 2pm asked again about lifting vs recovery day. --Monitoring, recurring
- Isn't reliably responding to emails. --Monitoring
- She needs to be better at proactively remembering things. Had to share her architecture page with her again. --Fixed: added PROACTIVE RECALL prompt instruction
- Inconsistent with confirming when she's completed a task. --Fixed: added TASK CONFIRMATION prompt instruction
- Along those lines, she gets stuck in her action loop. She just emailed my friend twice. Once when I asked, and again when I asked her something completely different. --Fixed: 15-min Redis dedup on ayden_send_email