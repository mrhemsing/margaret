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
- **Voice/telephony:** ElevenLabs Conversational AI + Twilio
- **Notifications:** SMS/email provider TBD
- **Scheduler:** worker/cron model TBD after deployment target is selected

## Why this stack

Next.js gives us a fast path to both caregiver UI and API routes in one repo. That is useful for the first vertical slice: member setup, scheduled call records, simulated call execution, and caregiver alert views.

ElevenLabs Conversational AI is the active product voice direction. Twilio remains the telephony layer because it owns phone numbers, outbound calling, answering-machine detection, call status, and carrier logs.

OpenAI Realtime remains available only for explicit comparison/testing when Matt asks for it. It is not the default for landing-page demos, trials, subscriber calls, dashboard calls, or scheduled daily calls.

ElevenLabs product-call alignment:

- Twilio starts outbound calls and performs answering-machine detection.
- Human-answered calls are registered with ElevenLabs using the configured agent.
- The app passes member memory, current context, voice selection, and first-message overrides into ElevenLabs client data.
- Downstream summaries/memory remain app-owned structured extraction, not uncontrolled model learning.

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
- Bridge human-answered calls into ElevenLabs Conversational AI.
- Default production pacing is intentionally snappy: short caring replies, eager turn-taking, and curated ElevenLabs voice choices.
- Pass member-specific context into each call: member name, preferred greeting, caregiver contact rules, memory, topics to revisit, topics to avoid, and preloaded current context.
- Use pre-call context snapshots for weather, sports, light news, and member interests instead of blocking natural conversation with live lookups.
- Receive Twilio status callbacks and ElevenLabs conversation transcripts.
- Store transcript and structured outcome.
- Extract family-safe memory updates after the call: mood, topics, notable moments, follow-up needs, preferences, routines, and health/context notes.

### Phase 4 — caregiver alerts

- Add SMS/email adapter.
- Implement alert rules and retry policy.
- Add audit log for alert delivery.

## Provider abstraction

Voice and notifications should be behind small adapters so the MVP can swap vendors without rewriting app logic. The active product voice implementation targets ElevenLabs + Twilio.

Suggested interfaces:

- `VoiceCallProvider.startCheckInCall(member, script)`
- `VoiceCallProvider.handleWebhook(payload)`
- `NotificationProvider.sendCaregiverAlert(alert)`
- `NotificationProvider.sendDailySummary(summary)`

## Current ElevenLabs Defaults

- Provider: `elevenlabs_twilio`
- Agent: configured by `ELEVENLABS_AGENT_ID`
- Voice: member-selected curated ElevenLabs voice, falling back to the DailyCall default.
- Turn-taking: tuned in ElevenLabs agent settings for fast, natural conversation.
- Conversation style: fast response after speech ends, one short caring sentence by default, no filler, no long lead-ins, no scripted survey tone.
