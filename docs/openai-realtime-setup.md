# OpenAI Realtime Setup — DailyCall

## Active direction

DailyCall is now all-in on OpenAI Realtime for the active voice agent path, with ElevenLabs retained only as a fallback.

Active provider:

```env
VOICE_PROVIDER=openai_realtime_twilio
```

## Why this is the right fit

OpenAI Realtime supports DailyCall's mission better than a chained STT -> LLM -> TTS setup because the model can listen, reason, speak, emit transcript events, handle interruptions, and use app-provided context in one realtime session.

For senior phone calls, the production architecture should use SIP:

1. DailyCall starts an outbound call with Twilio.
2. Twilio answering-machine detection protects against voicemail.
3. Human answers are bridged to OpenAI's SIP endpoint.
4. OpenAI sends `realtime.call.incoming` to `/api/openai/realtime-webhook`.
5. DailyCall accepts the call with the member's prompt, memory, current context, voice, reasoning, VAD, and transcript settings.
6. DailyCall monitors Realtime events over WebSocket and stores transcripts/outcomes.
7. DailyCall creates the family summary and memory updates after the call.

Reference:

- https://developers.openai.com/api/docs/guides/realtime-sip

## Required environment

```env
OPENAI_API_KEY=
OPENAI_PROJECT_ID=
OPENAI_WEBHOOK_SECRET=
OPENAI_REALTIME_MODEL=gpt-realtime-2
OPENAI_REALTIME_VOICE=marin
OPENAI_REALTIME_REASONING_EFFORT=low
OPENAI_REALTIME_VAD_EAGERNESS=low
```

Twilio is still required:

```env
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=
```

## Dashboard setup

In the OpenAI dashboard:

1. Find the project ID for the project that owns the API key.
2. Create a webhook endpoint pointed at:

```text
https://soma3.b-average.com/api/openai/realtime-webhook
```

3. Subscribe it to Realtime incoming call events.
4. Copy the webhook signing secret into `OPENAI_WEBHOOK_SECRET`.

The SIP URI format is:

```text
sip:$OPENAI_PROJECT_ID@sip.api.openai.com;transport=tls
```

DailyCall passes Twilio call metadata as custom SIP headers so the webhook can match the OpenAI call to the existing `CallAttempt`.

## Model and voice defaults

Current defaults are intentionally optimized for the senior companion use case:

- Model: `gpt-realtime-2`
- Default voice: `marin`
- Female dashboard/signup choice: `marin`
- Male dashboard/signup choice: `cedar`
- Reasoning: `low`
- Turn detection: conservative `semantic_vad` with `eagerness=low`, `create_response=true`, and `interrupt_response=false`
- Input transcription: `gpt-realtime-whisper`
- Transcription language hint: `en`
- Transcription delay: `minimal`
- Input noise reduction: disabled for SIP phone calls while tuning audio stability
- Response cap: `max_output_tokens=320`

Use `low` reasoning for ordinary check-ins because it keeps `gpt-realtime-2` voice agents responsive. Increase reasoning only for harder workflows such as complex tool use, conflicting context, or post-call extraction.

Use `high` semantic VAD for the active check-in caller because DailyCall should respond quickly after the senior finishes speaking. If testing shows the agent interrupts slower speakers too often, lower to `medium` for that member or profile.

In the Realtime session payload, VAD belongs under `audio.input.turn_detection`, matching current OpenAI docs. Keep that shape aligned in both production SIP calls and the browser `/realtime-test` session.

References:

- https://developers.openai.com/api/docs/guides/realtime-vad
- https://developers.openai.com/api/docs/guides/realtime-transcription
- https://developers.openai.com/api/docs/guides/realtime-costs

## Voice personality

The default voice direction is:

- soft
- caring
- understanding
- familiar
- human-like
- clear enough for older adults
- not salesy, clinical, robotic, or overly cheerful

Prompt posture:

- Respond as soon as the member stops speaking.
- Keep replies to one short caring sentence by default.
- Ask one gentle question at a time.
- Avoid filler, repeated acknowledgements, long lead-ins, and scripted wellness-survey language.
- Use memory and current context sparingly so the call feels familiar, not forced.

## Current context

DailyCall should preload current context before calls instead of relying on live lookups during conversation.

Current context can include:

- local weather
- sports schedules or scores relevant to the member
- holidays
- safe, light news topics
- family notes
- topics to revisit
- topics to avoid

The agent must not invent current facts. If current context is missing and the member asks, it should say it does not have that information right now and keep the conversation moving.

## Safety boundaries

DailyCall is not:

- emergency dispatch
- medical diagnosis
- medical treatment
- legal or financial advice
- a replacement for family, home care, nursing, or social work

If the member reports immediate danger, serious injury, severe symptoms, fear, confusion, inability to get up, lack of food/water/medication, or a direct help request, the agent should calmly encourage contacting emergency services or a trusted person and the app should escalate according to configured caregiver rules.

## Verification before rollout

Before live senior users:

1. Browser `/realtime-test` confirms Marin voice, high VAD, snappy pacing, and prompt tone.
2. Twilio test call reaches OpenAI SIP.
3. OpenAI webhook accepts the call and starts the greeting.
4. Transcript events persist to the matching `CallAttempt`.
5. Call status completes cleanly.
6. Family summary and memory extraction run after the call.
7. Missed-call, voicemail, and retry flows still work.
8. At least five full test calls are reviewed for warmth, pause length, interruption behavior, summary quality, and safety handling.
