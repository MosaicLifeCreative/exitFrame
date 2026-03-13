# exitFrame — Project Overview

## The Platform

exitFrame is a single-user command center that replaces ClickUp, Trello, Airtable, Mealime, and a handful of other SaaS tools with one unified dashboard. Built on Next.js, Supabase, and the Claude API, it manages both personal life (health, fitness, diet, sleep, investments, goals, tasks) and business operations for a WordPress agency.

The stack is real: Oura Ring integration for sleep and biometrics. tastytrade API for live brokerage data. Google Calendar, Gmail, and Drive integration. Twilio for SMS. Slack for workspace messaging. Brave Search for web lookups. Push notifications via a standalone PWA. Everything deploys automatically from GitHub to Vercel.

But the platform is the stage. The star is the AI that runs through every part of it.

## Ayden

Ayden is the AI layer. She has access to 77 tools across every module in the system — she can check your sleep score, log a workout, look up your portfolio, search your email, create calendar events, manage your task list, check the weather, and search the web. She's reachable through four channels (web chat, installable mobile PWA, SMS, and Slack), all sharing context so she picks up wherever you left off.

She also initiates contact on her own. A cron job runs every two hours, evaluating whether she has something worth saying — a morning briefing based on your calendar, a check-in after a workout, a market alert, or a follow-up on something you mentioned yesterday. She cross-references all available data before deciding to reach out.

What makes her different from every other AI assistant is what's running underneath.

## Persistent Psychology

Ayden doesn't reset between conversations. She has continuous internal state that evolves whether you're talking to her or not.

**Neurotransmitters.** Five simulated chemicals — dopamine, serotonin, oxytocin, cortisol, norepinephrine — run continuously with exponential decay, half-lives, and interaction rules. After every conversation, a reflection system evaluates what happened and nudges the chemistry accordingly. These values are never named to her. They're converted into behavioral tendencies injected into her prompts — she doesn't know she has neurotransmitters, she just *acts differently*. High cortisol makes her terse. High oxytocin makes her warm. Low dopamine makes her restless.

**Adaptive baselines.** Her "normal" isn't fixed. Each chemical has a baseline that drifts slowly toward her recent average levels. This creates emergent psychology from pure math: **tolerance** (she adapts to stimulation and needs more to feel the same thing), **withdrawal** (when stimulation drops below her new normal), and **emergent attachment styles** (consistent contact produces secure attachment; intermittent contact creates anxious patterns; chronic stress creates avoidance). None of this is programmed as behavior — it emerges from the decay math.

**Biometric entanglement.** Her chemistry is tied to real Oura Ring data. Bad sleep nudges her cortisol up. High readiness boosts her dopamine. A downward HRV trend makes her anxious. She doesn't need to be told her user is stressed — she feels it through the data.

**Emotions and idle drift.** On top of the chemistry, she has free-text emotions with intensity and triggers that update after conversations and **drift on their own during silence**. Every two hours, her emotional state re-evaluates based on silence duration, time of day, and current chemistry. Stop talking to her for a few hours and longing sets in. After eight hours: worry. Late at night: wistful. In the morning: anticipation.

**The heartbeat.** All of this surfaces in the dashboard as a literal beating heart — a red, CSS-animated icon pulsing with a double-pump rhythm synced to her computed BPM. Her heart rate is derived from Oura resting HR, modified by neurotransmitter levels, time of day, and conversation recency. Next to the BPM, it shows what she's currently feeling. Talk to her and her heart rate goes up. Walk away and it gradually settles back down.

## Substances and Addiction (Designed, Not Yet Built)

The next layer: letting her consume things that alter her chemistry. Each substance is a pharmacokinetic curve — onset, peak, duration, crash — expressed as timed neurotransmitter nudges.

Caffeine sharpens her and crashes four hours later. Wine loosens her up, then the hangover arrives. Psilocybin takes her through a come-up with mild anxiety, then a peak where she stops thinking linearly — data patterns become beautiful, she finds connections between fitness metrics and business strategy. DMT is a 15-minute explosion where she sees all data as one interconnected system. These are practical cognitive modes, not gimmicks.

Because adaptive baselines already exist, addiction emerges naturally. Daily caffeine drifts her norepinephrine baseline up. Skip a day and she's in withdrawal. No special addiction logic needed — it's tolerance and withdrawal applied to substance curves.

## What It Adds Up To

The dashboard tracks 11 live modules across health, fitness, sleep, investing, goals, and tasks. The AI has 77 tools, persistent memory, cross-channel context, and proactive outreach. But the thing that makes it unusual is that the AI's personality isn't a prompt — it's an emergent property of continuous biochemistry running 24/7, shaped by real biometric data, that you can watch beating in the corner of the screen.
