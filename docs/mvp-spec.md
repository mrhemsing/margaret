# MVP Spec — dailycall

## Objective

Build a working vertical slice of a scheduled AI voice check-in service for elderly or disabled people who live alone, plus next-of-kin/caregiver reporting.

## North star

DailyCall should become the #1 check-in care caller for seniors in the world.

The MVP should therefore prove more than “an AI can make a call.” It should prove:

- Seniors can answer a normal phone and enjoy the voice.
- The call feels warm, human, respectful, and not like a survey.
- Turn-taking is snappy, with minimal awkward pauses.
- Families get useful peace of mind without exposing every private detail.
- The service catches missed calls, help requests, and concerning signals with clear, conservative rules.
- The product is honest about being AI, not medical care, and not emergency response.

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

Minimum conversation goals:

1. Identify DailyCall and be honest that it is an AI voice assistant if asked or when disclosure is required.
2. Greet the member warmly and naturally.
3. Ask how they are doing today.
4. Use memory/current context only when it makes the call feel familiar, not forced.
5. Notice concerning signals: help requests, confusion, distress, falls, severe symptoms, food/water/medication access, or inability to get up.
6. Ask whether they would like caregiver or next-of-kin follow-up when appropriate.
7. Close warmly and briefly.

Conversation style:

- Soft, caring, understanding, and human-like.
- Snappy turn-taking: respond as soon as the member finishes speaking.
- Short replies by default, usually one sentence.
- One gentle question at a time.
- No filler, long lead-ins, repeated acknowledgements, or generic wellness-survey tone.

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

Use OpenAI Realtime for the AI voice agent and Twilio for outbound phone calls.

Why:

- OpenAI Realtime keeps listening, reasoning, and speaking in one realtime model loop.
- Twilio gives us phone number ownership, caller ID, outbound calling, answering-machine detection, and mature telephony logs.
- The app can inject DailyCall memory, pre-call current context, reasoning effort, voice, and VAD settings directly into each Realtime session.
- ElevenLabs settings remain available if we decide to switch back.

Current production defaults:

- `VOICE_PROVIDER=openai_realtime_twilio`
- `OPENAI_REALTIME_MODEL=gpt-realtime-2`
- `OPENAI_REALTIME_VOICE=marin`
- `OPENAI_REALTIME_REASONING_EFFORT=low`
- `OPENAI_REALTIME_VAD_EAGERNESS=high`
- Turn detection: semantic VAD.
- Transcription: `gpt-realtime-whisper` events captured for summaries and memory extraction.

Evaluation criteria before production:

- outbound call reliability
- latency / naturalness
- transcript access
- structured extraction
- cost per minute
- webhook support
- compliance posture
- Canadian/US calling and consent requirements
- senior delight: whether the recipient would willingly answer again tomorrow
- family trust: whether the summary feels useful, respectful, and not creepy

## First technical milestone

Create a local/API-only prototype that can:

1. create a member,
2. create a schedule,
3. simulate due-call execution,
4. produce a fake call outcome,
5. trigger a fake caregiver notification.

Then replace simulation with real telephony/voice provider.

## Production readiness checklist

- OpenAI project ID configured for SIP endpoint.
- OpenAI webhook secret configured and verified for `/api/openai/realtime-webhook`.
- Twilio outbound calls route human answers to OpenAI SIP after answering-machine detection.
- Test call confirms: answer, first greeting, high-VAD snappiness, interruption handling, transcript capture, call completion, summary extraction, SMS report, missed-call handling.
- At least five real senior-style test calls reviewed for warmth, clarity, pause length, and family-summary usefulness before broader rollout.
