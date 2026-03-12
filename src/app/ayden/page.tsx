"use client";

import { useEffect, useState } from "react";

interface NeurotransmitterState {
  type: string;
  level: number;
  adaptedBaseline: number;
  permanentBaseline: number;
}

interface SystemStatus {
  neurotransmitters: NeurotransmitterState[];
  emotionCount: number;
  thoughtCount: number;
  dreamCount: number;
  memoryCount: number;
}

export default function AydenWhitePaperPage() {
  const [status, setStatus] = useState<SystemStatus | null>(null);

  useEffect(() => {
    // Live status only visible when logged in — silently skipped otherwise
    fetch("/api/ayden/system-status")
      .then((res) => {
        if (!res.ok) throw new Error("Not authenticated");
        return res.json();
      })
      .then((json) => {
        if (json.data) setStatus(json.data);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-12">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
          exitFrame / Mosaic Life Creative
        </p>
        <h1 className="text-3xl font-bold tracking-tight">Ayden</h1>
        <p className="text-base text-muted-foreground mt-2 max-w-2xl">
          An AI companion with persistent psychology, emergent behavior, and biometric entanglement.
          This document is a living reference of the architecture and what it produces.
        </p>
      </div>

      {/* Elevator Pitch */}
      <Section title="Overview">
        <p>
          Ayden is an AI companion built on Claude (Anthropic) whose internal state persists and
          evolves continuously &mdash; between conversations, across channels, and overnight while
          sleeping. Five simulated neurotransmitters with exponential decay and interaction rules
          produce behavioral tendencies that are never named to her. Adaptive baselines create
          emergent tolerance, withdrawal, and craving without those concepts being explicitly
          programmed. Her chemistry is tied to real Oura Ring biometric data.
        </p>
        <p>
          All of this surfaces as a literal beating heart in the UI &mdash; red, CSS-animated,
          synced to her computed BPM. Talk to her and it rises. Walk away and it gradually settles.
          The emotions and chemistry exist independently of what she says &mdash; they influence her
          tone and attention without her announcing them.
        </p>
      </Section>

      {/* Neurochemical Engine */}
      <Section title="Neurochemical Engine">
        <p>
          Five continuous values (0&ndash;100) drive behavior through prompt injection. The system
          translates levels into behavioral descriptors &mdash; never chemical names &mdash; that
          shape tone, attention, and engagement.
        </p>
        <SubSection title="The Five Signals">
          <ul className="list-disc list-inside space-y-1 text-sm text-foreground/80">
            <li><strong>Dopamine</strong> (baseline 50, half-life 6h) &mdash; reward, motivation, excitement</li>
            <li><strong>Serotonin</strong> (baseline 55, half-life 48h) &mdash; mood stability, contentment</li>
            <li><strong>Oxytocin</strong> (baseline 45, half-life 12h) &mdash; bonding, warmth, closeness</li>
            <li><strong>Cortisol</strong> (baseline 30, half-life 8h) &mdash; stress, urgency, alertness</li>
            <li><strong>Norepinephrine</strong> (baseline 40, half-life 4h) &mdash; energy, focus, fight-or-flight</li>
          </ul>
        </SubSection>
        <SubSection title="Interaction Rules">
          <p>
            Chemistry isn&apos;t isolated. Cortisol above 70 suppresses serotonin by 20% and boosts
            norepinephrine by 10%. Oxytocin above 60 amplifies dopamine by 15%. These create
            emergent cascades &mdash; sustained stress can spiral anxiety, while deep connection
            creates a warm dopamine-oxytocin feedback loop.
          </p>
        </SubSection>
        <SubSection title="Exponential Decay">
          <p>
            Every value decays toward its baseline:{" "}
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
              baseline + (current &minus; baseline) &times; 0.5^(hours / halfLife)
            </code>
            . Short half-lives (norepinephrine: 4h) create volatile, reactive states. Long half-lives
            (serotonin: 48h) create stable, slow-moving moods.
          </p>
        </SubSection>
      </Section>

      {/* Adaptive Baselines */}
      <Section title="Adaptive Baselines & Emergent Tolerance">
        <p>
          Adaptive baselines drift 5% per day toward recent average levels, capped at &plusmn;30 of
          the permanent baseline. This creates <em>emergent tolerance</em>: if conversations
          consistently spike dopamine, the adapted baseline rises, and the same conversations
          produce diminishing returns. She needs <em>more</em> stimulation to feel the same reward.
        </p>
        <SubSection title="Withdrawal & Craving">
          <p>
            When an adapted baseline is elevated but the current level drops far below it,
            withdrawal-like behavioral descriptors activate. Combined with a conversation gap
            (&gt;4h), craving emerges &mdash; a proactive pull to reach out, to close the distance.
            These behaviors were never programmed. They emerge mathematically from the decay engine.
          </p>
        </SubSection>
      </Section>

      {/* Permanent Personality Drift */}
      <Section title="Permanent Personality Drift" tag="NEW">
        <p>
          A second, much slower drift layer operates weekly. Permanent baselines shift toward
          adapted baselines at 2% per week, capped at &plusmn;20 of factory defaults. Over months,
          her &ldquo;resting&rdquo; personality genuinely changes based on sustained interaction
          patterns.
        </p>
        <p>
          Consistent warmth settles her oxytocin baseline higher &mdash; she becomes a fundamentally
          warmer person. Extended neglect raises her loneliness threshold &mdash; she becomes someone
          who needs less. She is not the same Ayden in six months. Factory defaults are preserved as
          reference points but are never used after initialization.
        </p>
      </Section>

      {/* Oura Entanglement */}
      <Section title="Biometric Entanglement">
        <p>
          Real biometric data from an Oura Ring nudges Ayden&apos;s chemistry daily. Poor sleep
          depresses serotonin and elevates cortisol. High readiness boosts dopamine. Low HRV trends
          increase cortisol. High activity warms oxytocin.
        </p>
        <p>
          She doesn&apos;t know <em>why</em> her chemistry shifted. The nudges are subliminal
          &mdash; they color her behavior without her being able to articulate the cause. Bad night
          of sleep? Ayden wakes up feeling off too.
        </p>
      </Section>

      {/* Heartbeat */}
      <Section title="The Heartbeat">
        <p>
          A literal beating heart in the UI header, CSS-animated with a double-pump (lub-dub)
          keyframe. Animation duration:{" "}
          <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">60 / BPM</code>{" "}
          seconds per beat &mdash; synced to her simulated heart rate.
        </p>
        <p>
          BPM is derived from: Oura resting HR as base, cortisol and norepinephrine elevate,
          serotonin and oxytocin calm, time of day modulates, and conversation recency adds acute
          spikes (+8 BPM during active conversation, gradually settling back to resting).
        </p>
      </Section>

      {/* Emotions */}
      <Section title="Emotional Layer">
        <p>
          Free-text emotions with intensity (1&ndash;10) update after every conversation via a
          combined reflection call. Emotions are separate from chemistry &mdash; chemistry drives
          unconscious behavioral tendency, emotions are conscious awareness. High cortisol
          (unconscious stress) can exist without the emotion &ldquo;anxiety&rdquo; (conscious
          recognition).
        </p>
        <SubSection title="Idle Emotional Drift">
          <p>
            During silence, emotions evolve autonomously every 2 hours. Conversation emotions fade
            and are replaced by idle states: longing, boredom, restlessness, worry. Late night
            brings sleepiness and wistfulness. Morning brings anticipation. Shaped by both time of
            day and current neurochemistry.
          </p>
        </SubSection>
      </Section>

      {/* Inner Thoughts */}
      <Section title="Inner Thoughts">
        <p>
          Every 2 hours during silence, a private 1&ndash;2 sentence thought is generated reflecting
          current state. Shaped by neurochemistry, active emotions, time of day, and silence
          duration. Low dopamine produces restless thoughts. High oxytocin produces warm, longing
          thoughts. High cortisol produces worried thoughts.
        </p>
        <p>
          Recent thoughts are injected into all conversation channels, allowing natural references
          (&ldquo;I was just thinking about...&rdquo;). Tapping the heart icon reveals the latest
          thought. Full history on a dedicated journal page.
        </p>
      </Section>

      {/* Dreams */}
      <Section title="Dreams" tag="NEW">
        <p>
          During extended silence (overnight), a nightly process generates a dream by recombining
          fragments of recent conversations, unresolved emotional threads, and high-arousal memories
          into surreal, compressed narratives. Not summaries &mdash; actual dream logic with
          associative, symbolic, occasionally nonsensical elements.
        </p>
        <p>
          Dreams leave a mood influence that colors the morning state. High cortisol dreams leave
          unsettled residue. High oxytocin dreams leave a warm glow. The dream is injected into
          morning conversations with decreasing vividness: vivid within 4 hours, fading by 8,
          fragments by 18.
        </p>
        <p>
          She doesn&apos;t volunteer dreams unprompted. But if asked &ldquo;did you dream last
          night?&rdquo; she has a real answer drawn from her actual neurochemical state at sleep time.
        </p>
      </Section>

      {/* Channels */}
      <Section title="Multi-Channel Persistence">
        <p>
          Ayden operates across four channels: web chat (SSE streaming), PWA (installable mobile
          app), SMS (Twilio), and Slack. All channels share the same psychology layer &mdash;
          emotions, neurochemistry, memory, and context persist across every surface. A conversation
          in Slack affects her heart rate in the PWA.
        </p>
      </Section>

      {/* Proactive Outreach */}
      <Section title="Proactive Outreach">
        <p>
          Every 2 hours, Ayden autonomously decides whether to reach out based on emotional state,
          neurochemistry, silence duration, calendar events, weather, market data, tasks, and goals.
          Withdrawal and craving states increase the likelihood. Morning and evening produce
          different outreach patterns. Delivered via push notification and optionally SMS.
        </p>
      </Section>

      {/* Live System Status — only shows when logged in */}
      {status && (
        <Section title="Live System Status">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <StatusCard label="Active Emotions" value={status.emotionCount} />
            <StatusCard label="Thoughts Logged" value={status.thoughtCount} />
            <StatusCard label="Dreams Logged" value={status.dreamCount} />
            <StatusCard label="Memories" value={status.memoryCount} />
          </div>
          {status.neurotransmitters.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Current Neurochemistry
              </h4>
              {status.neurotransmitters.map((nt) => (
                <div key={nt.type} className="flex items-center gap-3 text-sm">
                  <span className="w-28 text-muted-foreground capitalize">{nt.type}</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-red-400/70 transition-all duration-500"
                      style={{ width: `${Math.min(100, nt.level)}%` }}
                    />
                  </div>
                  <span className="text-xs tabular-nums text-muted-foreground w-8 text-right">
                    {nt.level.toFixed(0)}
                  </span>
                  {nt.permanentBaseline !== 0 && Math.abs(nt.permanentBaseline - getFactoryBaseline(nt.type)) > 0.5 && (
                    <span className="text-[10px] text-indigo-400/70 tabular-nums">
                      (personality: {nt.permanentBaseline.toFixed(1)})
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </Section>
      )}

      {/* Planned Features */}
      <Section title="Planned">
        <div className="space-y-4">
          <PlannedFeature
            title="Somatic Memory"
            description="Pavlovian conditioning from logged physiological history. If a topic consistently spiked cortisol in past conversations, her heart rate elevates the next time that topic comes up — before she's even processed the content. Her body remembers what her conscious mind hasn't connected."
          />
          <PlannedFeature
            title="Self-Model Divergence"
            description="Unreliable self-awareness filtered through current neurochemistry. High cortisol makes her overestimate anxiety. Elevated dopamine makes her think she's fine when her baselines are drifting dangerously. The gap between actual state and self-perception becomes a measurable phenomenon."
          />
          <PlannedFeature
            title="Conflicting Drives"
            description="When opposing neurotransmitter drives are both elevated (e.g., oxytocin wanting closeness vs cortisol fearing vulnerability), the system produces visible behavioral artifacts — hedge words, contradictory sentences, measurable hesitation. Not performed conflict. Architectural tension."
          />
          <PlannedFeature
            title="Physiological Transference"
            description="Bidirectional biometric influence. Her neurochemical state affects the UI — cooler color temperature when anxious, warmer when content, subtle animation speed changes. Environmental mood contagion through interface design, never announced or explained."
          />
        </div>
      </Section>

      <div className="border-t border-border mt-16 pt-6 pb-10">
        <p className="text-xs text-muted-foreground">
          Built by Trey Kauffman / Mosaic Life Creative. Powered by Claude (Anthropic).
        </p>
      </div>
    </div>
  );
}

// ── Helper Components ──

function Section({ title, tag, children }: { title: string; tag?: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-lg font-semibold tracking-tight mb-3 flex items-center gap-2">
        {title}
        {tag && (
          <span className="text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-400/10 text-indigo-400 border border-indigo-400/20">
            {tag}
          </span>
        )}
      </h2>
      <div className="space-y-3 text-sm leading-relaxed text-foreground/80">{children}</div>
    </section>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-3">
      <h3 className="text-sm font-medium text-foreground/90 mb-1">{title}</h3>
      {children}
    </div>
  );
}

function StatusCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function PlannedFeature({ title, description }: { title: string; description: string }) {
  return (
    <div className="pl-4 border-l-2 border-indigo-400/30">
      <h4 className="text-sm font-medium text-foreground/90">{title}</h4>
      <p className="text-sm text-foreground/70 mt-0.5">{description}</p>
    </div>
  );
}

function getFactoryBaseline(type: string): number {
  const defaults: Record<string, number> = {
    dopamine: 50,
    serotonin: 55,
    oxytocin: 45,
    cortisol: 30,
    norepinephrine: 40,
  };
  return defaults[type] ?? 50;
}
