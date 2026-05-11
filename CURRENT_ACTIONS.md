# Dailycall Current Actions

## North Star

Make the senior want tomorrow’s call.

Monitoring is the buyer hook. **Personalization is the moat.** Companionship, emotional continuity, memory, and family trust are how we compound it.

## Active Backlog

### 1. Reframe the call experience from check-in to companion
Status: **In progress**

Actions:
- [ ] Rewrite the ElevenLabs agent instructions so the opening feels warm, familiar, and non-clinical.
- [ ] Pass memory/context into every outbound call.
- [ ] Avoid repeated openings and stale survey-like phrasing.
- [ ] Add gentle safety escalation only when risk signals appear.

### 2. Build Senior Memory v1
Status: **Started / first schema shipped**

Shipped:
- [x] Added `SeniorMemory` model.
- [x] Added call report fields for mood, topics, notable moments, follow-up, and memory updates.
- [x] Sync now extracts insights and updates memory.
- [x] Dashboard now displays richer emotional/family-trust report fields.

Next:
- [ ] Inject memory into outbound call dynamic variables.
- [ ] Add visible “Memory captured” section to dashboard.
- [ ] Preserve cumulative hobbies/routines/health notes instead of replacing them.

### 3. Anti-repetition safeguards
Status: **Next active build chunk**

Actions:
- [ ] Store last 5 summaries/topics per senior.
- [ ] Pass recent topics/questions into the voice agent.
- [ ] Tell agent what not to repeat.
- [ ] Rotate conversation themes: family, memories, hobbies, plans, weather, gratitude, light humor.
- [ ] Track repeated-call patterns and flag shallow loops.

### 4. Family trust dashboard
Status: **Started**

Shipped:
- [x] Mood.
- [x] Topics discussed.
- [x] Notable moments.
- [x] Follow-up suggested/reason.

Next:
- [ ] Memory updates captured.
- [ ] Family-friendly “why this matters” explanation.
- [ ] Separate safety alerts from warm companion summaries.

### 5. Reliability polish
Status: **Started**

Shipped:
- [x] Automatic transcript sync every 2 minutes.
- [x] Duplicate in-progress rows hidden.
- [x] Duplicate rapid test calls guarded.
- [x] Stuck-call timeout fallback.

Next:
- [x] Add strict voice-agent instruction: never leave voicemail; end immediately on voicemail/recording/beep.
- [ ] After-call voicemail/answering-machine detection from transcript and provider metadata.
- [ ] Record voicemail outcomes separately from answered conversations.
- [ ] Add client-visible retry settings: retry count, retry delay, and when to alert family.
- [ ] Schedule retries when voicemail/no-answer is detected.
- [ ] Clear no-answer / short-hangup states.
- [ ] Add configurable call time limits by plan/profile.
- [ ] Give the agent a warm close before ending near the time limit.
- [ ] Better processing UI while ElevenLabs finishes transcripts.

### 5a. Twilio AMD / second-number voicemail-safe architecture
Status: **Backlog / required before production voicemail guarantee**

Goal: guarantee Dailycall does not leave voicemail messages.

Required setup:
- [ ] Buy/provision a second Twilio number.
- [ ] Number A = outbound AMD screener / caller ID.
- [ ] Number B = ElevenLabs-connected agent number.
- [ ] Configure Number B in ElevenLabs as the inbound agent number.
- [ ] Configure Number A calls with Twilio `MachineDetection=Enable`.
- [ ] If Twilio detects machine/voicemail/fax: hang up immediately, record voicemail outcome, notify/retry according to settings.
- [ ] If Twilio detects human: bridge Number A call into Number B / ElevenLabs agent.
- [ ] Add tests for human answer, voicemail greeting, carrier recording, no-answer, busy, and failed.
- [ ] Expose client settings for retry count, retry delay, and alert timing.

Why this matters:
- Prompt-only voicemail avoidance reduces risk but cannot guarantee no voicemail.
- Pre-agent AMD is the production-grade guarantee.
- This should be completed before broad customer rollout.

### 6. Retention metrics
Status: **Pending**

Actions:
- [ ] Answered-call rate.
- [ ] Average call length.
- [ ] Repeat answer rate by week.
- [ ] Hangup/skipped-call rate.
- [ ] Week-4 retention.
- [ ] Family report engagement later.

## Current Implementation Focus

**Companion Context Injection + Anti-Repetition v1**

Goal: every outbound call should feel personally specific to that senior. It should receive memory, recent conversation context, family profile, rituals, and anti-repetition guidance so the agent sounds familiar and avoids generic check-in behavior.
