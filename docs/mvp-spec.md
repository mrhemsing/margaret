# MVP Spec — dailycall

## Objective

Build a working vertical slice of a scheduled AI voice check-in service for elderly or disabled people who live alone, plus next-of-kin/caregiver reporting.

## Non-goals for MVP

- No emergency dispatch integration.
- No medical diagnosis or treatment advice.
- No broad clinical care management.
- No claim that Dailycall replaces home care, nursing, or social work.
- No multi-tenant billing unless needed for pilot.

## Roles

### Caregiver

Configures the person receiving calls and receives daily text summaries plus urgent alerts.

### Member

Receives the daily call. Should not need to install anything.

### Operator

Can inspect call attempts, failures, and alert events during pilot.

## Required MVP capabilities

### 1. Member setup

Fields:

- name
- phone number
- timezone
- preferred call time
- caregiver contact(s)
- active/inactive status

### 2. Daily schedule

- Run once per day per active member.
- Respect member timezone.
- Create a `CallAttempt` record before starting the call.
- Avoid duplicate calls for the same schedule/day.

### 3. Voice call

Minimum script:

1. Identify service and AI nature.
2. Confirm member is available.
3. Ask how they are feeling today.
4. Ask about any immediate health or safety concerns.
5. Ask whether they need help or a caregiver follow-up.
6. Close warmly and briefly.

### 4. Outcome classification

Classify each attempt as one of:

- `completed_ok`
- `completed_concern`
- `help_requested`
- `no_answer`
- `failed`

### 5. Caregiver notification

Send caregiver / next of kin:

- daily text summary for completed OK calls;
- emergency/urgent notification for concern/help/no-answer/failed according to alert rules.

### 6. Operator visibility

At minimum, expose call attempts in logs or admin view with:

- member
- scheduled time
- call start/end
- status
- summary
- alert sent/not sent

## Alert rules draft

Immediate caregiver alert if:

- member explicitly says they need help;
- member sounds confused/distressed and classification is `completed_concern`;
- call is missed after configured retries;
- telephony call fails.

## Retry draft

- First call at scheduled time.
- If no answer, retry once after 10 minutes.
- If second attempt fails/no-answer, alert caregiver.

## Selected voice direction

Use ElevenLabs Conversational AI for the AI voice agent and Twilio for outbound phone calls.

Why:

- Matt already has an ElevenLabs API key.
- ElevenLabs supports AI voice agents with Twilio phone numbers.
- Twilio gives us phone number ownership, caller ID, outbound calling, and mature telephony logs.
- This avoids building a full STT → LLM → TTS realtime media pipeline ourselves for MVP.

Evaluation criteria before production:

- outbound call reliability
- latency / naturalness
- transcript access
- structured extraction
- cost per minute
- webhook support
- compliance posture
- Canadian/US calling and consent requirements

## First technical milestone

Create a local/API-only prototype that can:

1. create a member,
2. create a schedule,
3. simulate due-call execution,
4. produce a fake call outcome,
5. trigger a fake caregiver notification.

Then replace simulation with real telephony/voice provider.
