# DailyCall Current Actions

## North Star

Make the senior want tomorrow's call.

Voice is the product. Monitoring is the buyer hook, but personalization, emotional continuity, memory, safety judgment, and family trust are how DailyCall becomes the #1 check-in care caller for seniors in the world.

## Active Backlog

### 1. ElevenLabs production call path

Status: **Active**

Shipped:
- [x] Locked landing-page demo, dashboard/manual, test, and scheduled DailyCall product calls to `elevenlabs_twilio`.
- [x] Kept OpenAI Realtime routes only for explicit comparison/testing work, not default product traffic.
- [x] Added Twilio AMD -> ElevenLabs register-call path.
- [x] Injected DailyCall memory, profile context, pre-call current context, and selected voice into ElevenLabs calls.

Next:
- [ ] Run full ElevenLabs phone-path tests: human answer, voicemail, no-answer, busy, short hangup, and failed call.
- [ ] Continue tuning ElevenLabs turn-taking, first audio, and voice quality.

### 2. Voice quality operating loop

Status: **Active**

Defaults:
- `VOICE_PROVIDER=elevenlabs_twilio`
- ElevenLabs Conversational AI over Twilio
- soft, caring, understanding senior companion tone
- snappy turn-taking with short replies

Next:
- [ ] Run at least five senior-style human test calls and score them with the voice-quality rubric.
- [ ] Compare the curated ElevenLabs voices for senior comfort and naturalness.
- [ ] Capture pause length from Realtime events and flag repeated pauses over two seconds.
- [ ] Add member/profile-level VAD overrides for slower speakers.
- [ ] Keep a recurring OpenAI Realtime and senior voice-agent innovation watch.

### 3. Senior memory and pre-call context

Status: **Started**

Shipped:
- [x] Added `SeniorMemory` model.
- [x] Added call report fields for mood, topics, notable moments, follow-up, and memory updates.
- [x] Sync extracts insights and updates memory.
- [x] Dashboard displays richer emotional and family-trust report fields.
- [x] Pre-call current context snapshots are refreshed before outbound calls.
- [x] Memory and current context are now available to OpenAI Realtime instructions.

Next:
- [ ] Add visible "Memory captured" section to the dashboard.
- [ ] Preserve cumulative hobbies, routines, family notes, and health notes instead of replacing them.
- [ ] Store last five summaries/topics per senior for anti-repetition.
- [ ] Pass recent topics and "do not repeat" guidance into every OpenAI call.
- [ ] Personalize current context by member location and interests.

### 4. Family trust dashboard

Status: **Started**

Shipped:
- [x] Mood.
- [x] Topics discussed.
- [x] Notable moments.
- [x] Follow-up suggested and reason.

Next:
- [ ] Show memory updates captured.
- [ ] Add family-friendly "why this matters" explanation.
- [ ] Separate safety alerts from warm companion summaries.
- [ ] Keep transcripts as sensitive source material, not the default family-facing artifact.

### 5. Reliability and voicemail handling

Status: **Started**

Shipped:
- [x] Twilio AMD runs before connecting the AI caller.
- [x] Duplicate in-progress rows hidden.
- [x] Duplicate rapid test calls guarded.
- [x] Stuck-call timeout fallback.
- [x] Strict instruction: never leave voicemail; end immediately on voicemail/recording/beep.

Next:
- [ ] Validate AMD behavior with the OpenAI Realtime SIP path.
- [ ] Record voicemail outcomes separately from answered conversations.
- [ ] Add client-visible retry settings: retry count, retry delay, and when to alert family.
- [ ] Schedule retries when voicemail/no-answer is detected.
- [ ] Clear no-answer and short-hangup states.
- [ ] Add configurable call time limits by plan/profile.
- [ ] Give the agent a warm close before ending near the time limit.

### 6. Retention and quality metrics

Status: **Pending**

Actions:
- [ ] Answered-call rate.
- [ ] Average call length.
- [ ] Repeat answer rate by week.
- [ ] Hangup/skipped-call rate.
- [ ] Week-4 retention.
- [ ] Family report engagement.
- [ ] Voice-quality rubric trend.
- [ ] Pause-length trend.
- [ ] Memory reuse without repetition.

## Current Implementation Focus

**OpenAI Realtime production readiness + voice quality benchmark**

Goal: every outbound call should sound soft, caring, human-like, and personally specific, with snappy turn-taking and trustworthy family summaries. ElevenLabs remains available as a fallback, but active product work is now OpenAI Realtime.
