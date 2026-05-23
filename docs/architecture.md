# Architecture — dailycall

## Chosen MVP stack

Matt prefers React/Next.js, so the MVP will start as a Next.js app.

## Mission objective

DailyCall is being built to become the #1 check-in care caller for seniors in the world.

That means the architecture should optimize for:

- A senior experience that feels soft, caring, human, and easy to answer.
- Snappy natural turn-taking with minimal dead air.
- Reliable daily calling on ordinary phones and landlines.
- Family trust: concise summaries, missed-call alerts, clear privacy boundaries, and no creepy surveillance feel.
- Pre-call context and memory that make each call feel familiar without inventing current facts.
- Safety boundaries: no medical diagnosis, no emergency-dispatch claims, and clear escalation to caregivers/next of kin.

Initial stack:

- **App framework:** Next.js App Router
- **UI:** React + TypeScript + Tailwind CSS
- **Validation:** Zod
- **Database layer:** Prisma, database TBD
- **Voice/telephony:** OpenAI Realtime + Twilio SIP, with ElevenLabs settings retained as fallback
- **Notifications:** SMS/email provider TBD
- **Scheduler:** worker/cron model TBD after deployment target is selected

## Why this stack

Next.js gives us a fast path to both caregiver UI and API routes in one repo. That is useful for the first vertical slice: member setup, scheduled call records, simulated call execution, and caregiver alert views.

OpenAI Realtime is the active voice direction because it lets DailyCall keep listening, reasoning, speaking, VAD, live transcript events, prompt control, and future tool use in one programmable realtime loop. Twilio remains the telephony layer because it owns phone numbers, outbound calling, answering-machine detection, call status, and carrier logs.

Official OpenAI alignment:

- SIP is the correct production phone-call connection path for Realtime voice calls. OpenAI receives SIP traffic, sends a `realtime.call.incoming` webhook, and the app accepts the call with instructions/model/voice/tools before the model answers.
- WebRTC remains useful for browser testing and tuning, but the production senior phone-call path is SIP.
- Semantic VAD with high eagerness is appropriate for the current goal of faster turns; it chunks audio as soon as possible.
- `gpt-realtime-whisper` is appropriate for live transcript events; downstream summaries/memory should still be treated as app-owned structured extraction, not uncontrolled model “learning.”

Reference docs:

- OpenAI Realtime SIP: https://developers.openai.com/api/docs/guides/realtime-sip
- OpenAI Realtime WebRTC: https://developers.openai.com/api/docs/guides/realtime-webrtc
- OpenAI VAD: https://developers.openai.com/api/docs/guides/realtime-vad
- OpenAI Realtime transcription: https://developers.openai.com/api/docs/guides/realtime-transcription
- OpenAI Realtime costs: https://developers.openai.com/api/docs/guides/realtime-costs

## First implementation phases

### Phase 1 — local simulation

- Caregiver/member dashboard shell.
- Domain types for members, caregivers, schedules, call attempts, alerts.
- API routes for health and later CRUD.
- Simulated due-call runner.
- Fake notification output.

### Phase 2 — persistence

- Add Prisma schema.
- Choose local/dev database.
- Persist members, call attempts, summaries, and alerts.

### Phase 3 — real voice calls

- Use Twilio for outbound calling and answering-machine detection.
- Bridge human-answered calls into OpenAI Realtime over SIP.
- Accept OpenAI `realtime.call.incoming` webhooks with call-specific prompt, memory, voice, current context, reasoning, and VAD settings.
- Default production pacing is intentionally snappy: `low` reasoning, high semantic VAD eagerness, short caring replies, and Marin as the soft companion voice.
- Pass member-specific context into each call: member name, preferred greeting, caregiver contact rules, memory, topics to revisit, topics to avoid, and preloaded current context.
- Use pre-call context snapshots for weather, sports, light news, and member interests instead of blocking natural conversation with live lookups.
- Receive Twilio status callbacks, OpenAI Realtime webhooks, and Realtime transcript events.
- Store transcript and structured outcome.
- Extract family-safe memory updates after the call: mood, topics, notable moments, follow-up needs, preferences, routines, and health/context notes.

### Phase 4 — caregiver alerts

- Add SMS/email adapter.
- Implement alert rules and retry policy.
- Add audit log for alert delivery.

## Provider abstraction

Voice and notifications should be behind small adapters so the MVP can swap vendors without rewriting app logic. The active voice implementation targets OpenAI Realtime + Twilio SIP. ElevenLabs configuration remains in the repo as a rollback path.

Suggested interfaces:

- `VoiceCallProvider.startCheckInCall(member, script)`
- `VoiceCallProvider.handleWebhook(payload)`
- `NotificationProvider.sendCaregiverAlert(alert)`
- `NotificationProvider.sendDailySummary(summary)`

## Current OpenAI Realtime defaults

- Provider: `openai_realtime_twilio`
- Model: `gpt-realtime`
- Voice: `marin` for the default soft companion voice; `cedar` for the gentle caller alternate.
- Reasoning: `low` for ordinary check-ins; raise only for complex tool-heavy or summary/extraction work.
- Turn detection: `semantic_vad` with `eagerness: low` and interruption disabled while tuning phone stability.
- Transcription: `gpt-realtime-whisper` events captured during the call.
- Conversation style: fast response after speech ends, one short caring sentence by default, no filler, no long lead-ins, no scripted survey tone.
