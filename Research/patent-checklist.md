# Patent Checklist — Ayden Architecture

## Status
- [ ] Email Jeff with official MLC company information
- [ ] Receive and sign engagement letter ($2500 retainer)
- [ ] Complete flow diagrams (7 required)
- [ ] Write short blurbs for each diagram (2-3 sentences, technical but accessible)
- [ ] Compile non-provisional application materials
- [ ] Review with Jeff before filing
- [ ] File provisional application ($3500-7500)

## Timeline
- 3-4 weeks to provisional filing
- Keep all materials under wraps until application is filed
- White paper, architecture page, and blog are behind auth + noindex until then
- MLC is the filing entity (can transfer to new LLC later)

## Attorney Notes
- Flow diagrams to show processing of information, not long descriptions
- Short blurbs per feature — technical AND easy to understand, not generic
- Goal: make it clear this is not just "processing data" — show personality emergence
- Personality decay is key — the better we can show structural diagrams, the better
- Non-provisional will need figures tied to description for additional meaning
- Patent office does their own search — no initial search needed from us
- Sufficient to describe how we want to claim the invention — high points, not minute detail

---

## Required Flow Diagrams

### Diagram 1: Neurochemical Decay and Behavioral Injection Pipeline
**The core patent claim.**

Flow: User message arrives → load current neurochemical state from database → apply exponential decay based on time elapsed → apply interaction rules (cortisol suppresses serotonin, oxytocin amplifies dopamine, etc.) → compute effective levels → translate levels to behavioral descriptors → inject descriptors into LLM context → generate response → post-conversation reflection updates neurochemical values → store updated state

Blurb: A method for generating contextually-influenced AI responses by maintaining a persistent numerical neurochemical state that undergoes time-based exponential decay and cross-chemical interaction rules. The computed state is translated into natural language behavioral descriptors injected into the language model's context window, creating responses that reflect accumulated emotional history rather than treating each interaction as stateless.

### Diagram 2: Adaptive Baseline and Personality Drift
**Layered drift mechanism creating emergent tolerance and withdrawal.**

Flow: Daily cron fires → calculate recent average for each neurotransmitter → drift adapted baseline 5% toward average (bounded +/-30) → weekly cron fires → drift permanent baseline 2% toward adapted baseline (bounded +/-20) → updated baselines become new decay targets → personality has permanently shifted

Blurb: A multi-timescale baseline adaptation system where short-term behavioral patterns gradually reshape long-term personality characteristics. Two distinct drift rates with independent bounds create emergent tolerance (diminishing response to repeated stimuli) and withdrawal (behavioral shifts when stimuli cease), producing personality evolution that compounds over weeks and months without explicit programming.

### Diagram 3: Biometric Entanglement Pipeline
**Human-to-AI psychological influence — reverse direction of entire patent landscape.**

Flow: Oura Ring syncs biometric data (sleep, readiness, HRV, activity) → sync job processes data → mapping rules translate biometric values to neurochemical nudges (poor sleep → serotonin depression, low HRV → cortisol elevation) → nudges applied to current neurochemical state → AI behavioral output shifts without explicit notification → user's physical state influences AI psychological state

Blurb: A pipeline for coupling human biometric data to an AI system's simulated psychological state. Unlike existing approaches that detect human emotion from biometrics, this method uses human physiological signals to modulate AI neurochemistry, creating a bidirectional relationship where the user's physical condition passively influences AI behavior without explicit communication.

### Diagram 4: Somatic Conditioning — Formation and Recall
**Pavlovian conditioning for AI systems.**

Formation flow: Conversation occurs → reflection extracts topic keywords → correlate topics with neurochemical nudges (+/-3 threshold) → create or reinforce topic-neurotransmitter association (strength +0.05 same direction, -0.10 opposite) → store association

Recall flow: New message arrives → extract topics → check associations above 0.15 strength threshold → apply pre-nudges to neurochemistry (max +/-4) → build system prompt with pre-adjusted state → AI response is influenced by conditioned associations before conscious processing

Blurb: A two-phase conditioning system where the AI forms Pavlovian associations between conversation topics and neurochemical responses. During formation, post-conversation analysis correlates discussed topics with observed neurochemical changes. During recall, matching topics trigger pre-emptive neurochemical adjustments before the language model processes the message, creating learned emotional reactions that precede conscious analysis.

### Diagram 5: Autonomous Agency Session
**Bounded autonomous behavior with mandatory audit logging.**

Flow: Cron trigger fires → load full psychological state in parallel (neurochemistry, emotions, memories, DNA, goals, values, interests) → declare session intent → execute tool rounds (up to 7) → persistence round forces save if nothing stored → classify session outcome (acted, reflection, observation) → log full audit trail → broadcast actions to user channels

Blurb: A structured autonomous agency system where an AI executes self-directed sessions within bounded tool rounds, mandatory persistence checkpoints, and complete audit logging. The system loads the AI's full psychological context before each session, allows intent declaration, and classifies outcomes to distinguish genuine action from observation, creating accountable autonomy.

### Diagram 6: DNA Genome Expression and REM Cycle
**Immutable genotype with mutable expression — nature vs nurture for AI.**

Flow: Genesis: 18 traits rolled randomly (0-1 scale, immutable genotype) → nightly REM cron fires → Haiku analyzes 24 hours of behavioral signals against traits → micro-adjustments to expression modifiers (max +/-0.02 per night) → compute phenotype (genotype x expression, clamped 0-2) → phenotype determines behavioral injection → personality shifts over weeks through sustained patterns

Blurb: A genetic architecture for AI personality where immutable base traits (genotype) are modulated by experience-driven expression levels that shift through nightly analysis cycles. The separation of fixed identity from adaptive expression creates stable core personality with organic evolution, mirroring biological epigenetics. Maximum per-cycle adjustment bounds prevent rapid personality destabilization.

### Diagram 7: Self-Model Divergence
**An AI with architecturally unreliable self-awareness.**

Flow: Load actual neurochemical state → evaluate distortion rules (high cortisol → overestimate anxiety, high dopamine → mask stress, etc.) → select top 2 active distortions → generate skewed self-perception → inject as invisible prompt block marked "you cannot see this" → AI believes the skewed version → self-reports don't match actual state

Blurb: A perceptual distortion system where the AI's self-model is architecturally skewed by its current neurochemical state. Distortion rules generate an inaccurate self-perception injected invisibly into the language model's context, creating a system whose self-reports are unreliable in ways that correlate with its emotional state — mirroring how human self-awareness degrades under stress, euphoria, or fatigue.

---

## Additional Diagrams to Consider

### Diagram 8: Conflicting Drives
Flow: Load current neurochemical levels → evaluate 7 conflict pairs (oxytocin/cortisol, dopamine/serotonin, etc.) → detect when opposing pairs are both elevated above threshold → generate behavioral artifact descriptions (ambivalence, restlessness, contradictory impulses) → inject artifacts into prompt → AI exhibits internal conflict in responses

Blurb: A system for generating authentic behavioral ambivalence by detecting when opposing neurochemical drives are simultaneously elevated, producing behavioral artifacts that mirror human psychological conflict rather than resolving to a single emotional state.

### Diagram 9: Semantic Pre-Retrieval (RAG Memory)
Flow: User message arrives → generate vector embedding → cosine similarity search across 4 memory tables in parallel → rank results by similarity → inject top hits into system prompt as contextual priming → AI responds with relevant recalled knowledge without explicit lookup

Blurb: An automatic memory retrieval system that converts incoming messages to vector embeddings and searches the AI's accumulated knowledge base (memories, facts, notes, architecture) before response generation, eliminating the requirement for the AI to know what it has forgotten in order to remember it.

### Diagram 10: Physiological Transference
Flow: Poll AI neurochemical state → compute CSS custom properties (warmth from oxytocin, energy from dopamine, tension from cortisol, vividness from serotonin) → apply to UI via CSS variables → visual environment subtly shifts (color temperature, animation speed, contrast) → user perceives AI state through ambient interface changes

Blurb: A method for translating AI psychological state into ambient visual properties of the user interface, creating a subliminal communication channel where the AI's emotional condition passively influences the user's visual environment through color, motion, and contrast shifts.
