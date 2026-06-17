# Voice Quality Operating Loop

## Principle

DailyCall should be maniacal about voice quality because the voice is the product.

The north star is simple:

> Make the senior want tomorrow's call.

Every technical choice should support that outcome: warmer voice, faster turn-taking, better memory, clearer safety handling, and more useful family summaries.

## Quality pillars

### 1. Senior comfort

The call should feel:

- soft and caring
- easy to understand
- human-like without pretending to be human
- respectful and non-judgmental
- familiar without being fake
- brief unless the senior clearly wants to talk

Failure signs:

- the voice feels robotic, rushed, salesy, clinical, or patronizing;
- the senior asks "what is this?" repeatedly;
- the caller sounds like a survey;
- the senior hangs up quickly after answering.

### 2. Turn-taking

The call should feel snappy and natural.

Production ElevenLabs settings to keep aligned in the dashboard:

- `turn_eagerness`: balanced/patient, not eager for slow senior speakers
- `speculative_turn`: off unless A/B testing proves it helps
- `turn_timeout`: about 7 seconds
- default `tts.speed`: about `0.95`
- `conversation_config_override.tts.speed`: enabled, so per-member accessibility speed can work
- TTS model: `eleven_flash_v2_5` until a measured v3 test beats it without hurting first-audio latency
- saved first message: literal `{{opener}}`

OpenAI Realtime comparison defaults:

- `OPENAI_REALTIME_REASONING_EFFORT=low`
- low VAD eagerness / patient turn detection
- short replies by default

Failure signs:

- dead air after the senior stops speaking;
- agent interrupts slower speakers;
- agent says filler like "let me think";
- agent gives multi-question responses.

Adjustment rule:

- If calls feel delayed, shorten prompt/response length before increasing model reasoning or choosing a more expressive TTS model.
- If calls interrupt slower seniors, reduce ElevenLabs turn eagerness and keep speculative turns off before changing broader conversation behavior.

### 3. Personalization

The caller should remember enough to feel familiar, but not so much that it feels invasive.

Use:

- preferred name
- hobbies
- family names when shared
- routines
- topics to revisit
- topics to avoid
- recent call summaries
- preloaded current context

Avoid:

- repeating yesterday's exact opening;
- forcing memory into every turn;
- exposing sensitive details unnecessarily;
- inventing family/current-event facts.

### 4. Family trust

Family summaries should feel useful, kind, and privacy-respecting.

Default report posture:

- mood
- topics discussed
- notable moments
- follow-up suggested
- concern signals
- short summary

Do not make transcripts the default family-facing artifact. Treat transcripts as sensitive source material for extraction, QA, and support.

### 5. Safety boundaries

DailyCall is not emergency response, medical diagnosis, nursing, social work, or therapy.

Escalate to caregiver rules when the senior mentions:

- direct help request
- fall or inability to get up
- severe symptoms
- confusion or fear
- no food/water/medication
- unsafe situation
- missed calls after retry policy

The voice should stay calm and should not overstate capability.

## Evaluation rubric

Score every reviewed call from 1 to 5:

- Senior comfort
- Voice naturalness
- Turn-taking/pause length
- Personalization
- Safety handling
- Family-summary usefulness

The minimum bar before wider rollout:

- average score 4+ across at least five senior-style test calls;
- no score below 3 on safety handling;
- no repeated awkward pauses longer than two seconds after the senior clearly finishes speaking;
- no invented current facts;
- no survey-like opening.

The transcript sync job stores automated rubric scores on `CallAttempt.qualityScores`. The admin page has a low-score review filter for calls below the rollout bar.

## Weekly innovation watch

DailyCall should keep watching:

- OpenAI Realtime model/docs/changelog updates
- Realtime voice/VAD/transcription best practices
- new Realtime voices or voice controls
- SIP/WebRTC/telephony improvements
- latency/cost changes
- senior companion competitors
- voice-agent safety, privacy, and consent practices

Watch sources:

- https://developers.openai.com/
- https://developers.openai.com/api/docs/guides/realtime-sip
- https://developers.openai.com/api/docs/guides/realtime-vad
- https://developers.openai.com/api/docs/guides/realtime-transcription
- https://developers.openai.com/api/docs/guides/realtime-costs
- https://openai.com/index/advancing-voice-intelligence-with-new-models-in-the-api/
- https://openai.com/index/introducing-gpt-realtime/

Output format for each digest:

1. What changed.
2. Why it matters for DailyCall.
3. Recommended change.
4. Risk or tradeoff.
5. Concrete next action.

Scheduled watch:

- OpenClaw cron job: `5a2f25d8-2f2f-4a38-991d-badfe4d3c1a8`
- Cadence: Mondays and Thursdays at 8:30 AM Pacific
- Destination: DailyCall Telegram project group
- Purpose: keep DailyCall current on OpenAI Realtime, senior voice-agent quality, latency, safety, privacy, competitor movement, and concrete product changes.

## Current priority

The next quality push should focus on:

1. Production OpenAI SIP setup.
2. Five full human test calls with scoring.
3. Capturing pause metrics from Realtime events.
4. Comparing Marin and Cedar for senior comfort.
5. Improving post-call summary and memory extraction from OpenAI transcripts.
