# DailyCall Call 100 Action Plan

Date staged: 2026-06-09
Scope: local planning only. Do not commit, push, publish, or message externally from this plan unless Matt asks.

## North Star

By call 100, DailyCall should feel like it knows the senior as a person, not like it has a pile of transcripts.

The moat is durable memory plus low-latency, natural conversation plus family trust.

## Priority Order

### P0 - Memory Audit and Benchmark

Outcome: know exactly how DailyCall memory behaves today and what breaks by call 100.

- [x] Inventory every object saved after a call: transcript, summary, mood, topics, notable moments, follow-up, memory updates, current context, retry/call outcome.
- [x] Trace what gets injected into the next call for OpenAI Realtime and ElevenLabs paths.
- [x] Identify whether memories are cumulative, replaced, duplicated, contradicted, or forgotten.
- [x] Create a call-100 test fixture for one senior with 100 synthetic/seeded call summaries.
- [x] Run a retrieval prompt against the fixture and score whether the caller remembers people, routines, preferences, sensitive boundaries, recent topics, and old-but-important facts.
- [ ] Define a minimum memory bar: useful by week 12, no creepy overuse, no repeated story loops, no stale contradictions.

Acceptance check:
- [x] A short audit doc answers: what is saved, what is summarized, what is retrieved, what is shown to family, and what fails at call 100.

### P1 - Structured Senior Memory

Outcome: move from transcript/context dependence to a stable memory model.

- [ ] Define structured memory fields: people, relationships, routines, hobbies, preferences, health/context notes, emotional themes, topics to avoid, topics to revisit, communication style, and recent recap.
- [ ] Preserve cumulative memory instead of replacing hobbies, routines, family notes, and health notes.
- [ ] Add source metadata per memory: first heard, last confirmed, confidence, sensitivity, and last used in call.
- [ ] Add contradiction handling: update, supersede, or archive stale memories instead of appending conflicts.
- [ ] Add "do not mention" and "needs consent/careful wording" flags for sensitive facts.
- [ ] Store last five summaries/topics per senior for anti-repetition.
- [x] Preserve extracted app-derived revisit topics during transcript sync instead of resetting them to empty.
- [x] Capture concrete memory snippets when possible instead of only generic labels.

Acceptance check:
- A senior profile can survive changing facts over many calls without duplicate, stale, or over-shared memories.

### P1 - Retrieval and Call Prompting

Outcome: every call gets the right memory, not the most memory.

- [ ] Build a memory selection layer that chooses stable profile facts, recent recap, unresolved follow-ups, and relevant topics.
- [ ] Pass recent topics plus "do not repeat" guidance into every production call path.
- [x] Inject conversation-avoid boundaries into companion context and avoid-repeat guidance.
- [ ] Add prompt rules for using memory lightly: familiar, not invasive; one memory cue at a time; do not force callbacks.
- [ ] Personalize current context by member location and interests where available.
- [ ] Log which memories were injected and which were used.

Acceptance check:
- Test calls feel specific without opening with the same remembered facts or repeating yesterday's conversation.

### P1 - Voice Quality and Latency KPI

Outcome: call quality becomes measurable, not anecdotal.

- [ ] Measure user speech end to AI first audio for production call paths.
- [ ] Track repeated pauses over 2 seconds.
- [ ] Score at least five senior-style test calls with the existing rubric: comfort, naturalness, turn-taking, personalization, safety, family summary.
- [ ] Test interruptions, silence, rambling, repeated stories, emotional disclosure, confusion, and hard-of-hearing pacing.
- [ ] Compare DailyCall against Meela or another live competitor with the same test script if access is available.

Acceptance check:
- Dashboard or local QA log shows latency, pause, and rubric trends for reviewed calls.

### P2 - Family Trust Dashboard

Outcome: family/admin users can see that the relationship is getting smarter without exposing private transcripts by default.

- [ ] Add a visible "Memory captured" section.
- [ ] Show memory updates as family-friendly, editable insights.
- [ ] Separate safety alerts from warm companion summaries.
- [ ] Add simple trends: missed calls, call length, mood direction, topics, concern flags, follow-up loop.
- [ ] Add a "why this matters" explanation for family reports.
- [ ] Keep transcripts as sensitive source material, not default UI.

Acceptance check:
- A family member can tell what DailyCall learned, what changed, and whether anything needs attention in under 30 seconds.

### P2 - Memory Controls and Trust Copy

Outcome: users understand and control what DailyCall remembers.

- [ ] Add copy explaining what DailyCall remembers, what family sees, and what is private.
- [ ] Add edit/delete controls for captured memories.
- [ ] Add "forget this" and "do not bring this up" controls.
- [ ] Add clear boundaries: not emergency response, not medical/legal/financial advice, not replacing family.
- [ ] Add a hesitant-parent explanation script.

Acceptance check:
- Privacy and control are visible before purchase and inside the dashboard.

### P3 - Competitive Proof and Conversion

Outcome: DailyCall can win the first-call and signup comparison.

- [ ] Add or improve sample call/demo proof.
- [ ] Make first-call setup lower friction.
- [ ] Make missed-call/retry protocol explicit.
- [ ] Ensure pricing/trial language is clear.
- [ ] Collect before/after examples from memory improvements for internal review.

Acceptance check:
- A buyer can understand the offer, hear/try the experience, and trust the follow-up loop without a sales call.

## 60-Minute Heartbeat Protocol

Cadence: every 60 minutes while this plan is active.

Heartbeat rules:
- Stay local only.
- Do not commit.
- Do not push.
- Do not publish.
- Do not message the Telegram group unless Matt explicitly asks for an update.
- Check this file and local repo state.
- Record whether progress, no change, blocked, or done.
- Prefer finishing one meaningful item before opening a new front.

Heartbeat output shape:

```text
DailyCall call-100 heartbeat
Status: progress | no_change | blocked | done
Current focus: <one line>
Changed locally: <files or none>
Next 60 minutes: <one concrete action>
Blocker: <only if real>
```

## First Work Block

Recommended first 60 minutes:

1. Audit current memory persistence and retrieval paths.
2. Produce a short "current memory flow" map.
3. Identify the smallest implementation change that improves call-100 retention.
