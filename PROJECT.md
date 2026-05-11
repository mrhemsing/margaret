# Project Notes — dailycall

## Product direction

Dailycall is a daily check-in calling service for elderly or disabled people who live alone. The original service concept used trusted human Care Callers; this new version keeps the same core promise while using an AI voice agent to call each member at a scheduled time, run a brief wellness check, and notify next of kin/caregivers if something seems wrong or if the call fails.

## Primary users

- **Elderly member:** receives a predictable daily phone call and answers simple check-in questions.
- **Caregiver / family member:** configures the schedule, reviews status, and receives alerts.
- **Service operator:** manages accounts, reliability, billing, compliance, and escalation rules.

## Core value

Give families a lightweight daily safety signal without requiring the elderly or disabled person to install an app or remember to check in manually. The product should feel friendly, affordable, predictable, and human — even when the caller is AI.

## MVP user flow

1. Caregiver creates a member profile.
2. Caregiver sets:
   - phone number
   - preferred call time and timezone
   - emergency / escalation contacts
   - optional check-in questions
3. System places an AI voice call at the scheduled time.
4. AI asks a short scripted wellness check, ideally around 1 minute:
   - greeting
   - general wellbeing
   - immediate health or safety concerns
   - optional medication / meal / sleep prompt if configured
   - “Do you need help today?”
5. System records structured call outcome:
   - answered / missed / failed
   - sentiment or concern level
   - transcript / summary
   - explicit help request
6. System notifies caregiver:
   - normal daily summary, or
   - urgent alert if configured conditions are met.

## MVP done criteria

- Create/update member profile.
- Schedule recurring daily call.
- Trigger outbound voice call through a telephony provider.
- Run a simple AI voice conversation.
- Store call result and summary.
- Alert caregiver on missed call, explicit help request, or high concern.
- Basic admin/caregiver dashboard or equivalent CLI/API for testing.

## Architecture assumptions

Chosen MVP stack:

- Next.js App Router for web UI and API routes.
- React + TypeScript + Tailwind CSS for caregiver/operator UI.
- Prisma for database access once persistence is added.
- Zod for request/domain validation.
- Database, deployment target, scheduler, and notification providers are still TBD.
- Voice architecture: ElevenLabs Conversational AI agent + Twilio phone number/outbound calling.

Likely runtime components:

- Web app + API for caregiver onboarding and schedule management.
- Database for members, schedules, call attempts, transcripts, summaries, contacts, alert rules.
- Background scheduler/worker for due calls.
- Twilio for outbound calls and phone number management.
- ElevenLabs Conversational AI for realtime AI voice conversation.
- Notification provider for caregiver alerts: SMS/email initially.

## Safety / compliance notes

This product touches vulnerable people and health-adjacent information. MVP should be explicit that it is a wellness check-in service, not emergency medical monitoring.

Important early safeguards:

- Always disclose the caller is an AI assistant/service.
- Keep conversations short, predictable, and non-medical unless explicitly scoped.
- Escalate clearly on explicit help requests.
- Define missed-call retry behavior.
- Avoid diagnosing, prescribing, or giving medical instructions.
- Store transcripts and summaries securely.
- Make report/alert delivery reliable because next of kin may rely on daily text updates.
- Build audit logs for call attempts and alerts.
- Get caregiver/member consent for scheduled calls and recording/transcription where required.

## Open questions

- Which Twilio number/caller ID should Dailycall use for outbound calls?
- Is the first interface a caregiver web dashboard, admin dashboard, or internal CLI/API?
- Should caregivers receive SMS, email, app notification, or all three?
- What are the first alert rules?
- How many retry attempts after a missed call?
- Should the system support multiple languages at launch?
- What geography/jurisdiction is launch aimed at?

## Decisions

- Product: daily AI voice check-in calls for elderly people.
- Primary outcome: reliable daily status signal for caregivers.
- MVP stack starts with Next.js/React/TypeScript/Tailwind, matching Matt's preference.
- Planned AI voice calling stack: ElevenLabs Conversational AI + Twilio outbound phone calls.

## Risks / unknowns

- Telephony compliance and call consent requirements.
- Reliability expectations if families treat this like safety monitoring.
- False positives/false negatives in AI concern detection.
- Cost per call at scale.
- Need careful UX for elderly users who may be wary of AI calls.
