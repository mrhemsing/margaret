# Architecture — dailycall

## Chosen MVP stack

Matt prefers React/Next.js, so the MVP will start as a Next.js app.

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

- Create an ElevenLabs Conversational AI agent for Dailycall.
- Connect/import a Twilio phone number into ElevenLabs.
- Add outbound call adapter using ElevenLabs/Twilio outbound call API.
- Pass member-specific context into each call: member name, preferred greeting, caregiver contact rules, and check-in script.
- Receive webhook/callback events.
- Store transcript and structured outcome.

### Phase 4 — caregiver alerts

- Add SMS/email adapter.
- Implement alert rules and retry policy.
- Add audit log for alert delivery.

## Provider abstraction

Voice and notifications should be behind small adapters so the MVP can swap vendors without rewriting app logic. The first concrete voice implementation should target ElevenLabs + Twilio.

Suggested interfaces:

- `VoiceCallProvider.startCheckInCall(member, script)`
- `VoiceCallProvider.handleWebhook(payload)`
- `NotificationProvider.sendCaregiverAlert(alert)`
- `NotificationProvider.sendDailySummary(summary)`
