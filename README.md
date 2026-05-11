# dailycall

Dailycall is a daily check-in calling service for elderly or disabled people who live alone.

An AI voice agent calls each member at a scheduled time, asks a brief wellness check-in, records the outcome, sends daily text reports to next of kin/caregivers, and escalates when a call is missed or something seems wrong.

## MVP goal

Ship the smallest reliable version that can:

1. store a member profile and caregiver contact,
2. schedule a recurring daily call,
3. place an outbound AI voice call,
4. capture the result and summary,
5. send daily text reports and notify the caregiver when attention is needed.

## Core call flow

```text
Scheduled time arrives
  → outbound call starts
  → AI identifies itself and greets member
  → asks a brief wellness and safety check
  → detects normal / concern / help requested / no answer
  → stores result
  → sends next-of-kin summary or alert
```

## Initial entities

- `Caregiver`
- `Member`
- `CallSchedule`
- `CallAttempt`
- `CallSummary`
- `AlertContact`
- `AlertRule`

## Chosen MVP stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Prisma
- Zod
- Voice/telephony provider TBD
- SMS/email notification provider TBD

## Safety posture

Dailycall should be positioned as a wellness check-in and family notification service, not emergency medical monitoring.

The AI should not diagnose, prescribe, or provide medical advice. It should escalate explicit help requests or concerning call outcomes to configured caregivers.

## Project notes

See [`PROJECT.md`](./PROJECT.md) for product decisions, MVP scope, open questions, and risks.
