# ElevenLabs Setup — dailycall

## API key

Create a dedicated ElevenLabs API key named `dailycall`.

Recommended posture:

- Use a restricted key if ElevenLabs exposes the needed endpoint permissions.
- Do not paste the key into chat or commit it to git.
- Store locally as `ELEVENLABS_API_KEY` in `.env`.

## Required ElevenLabs capabilities

Dailycall plans to use ElevenLabs as the full conversational voice agent layer, not only text-to-speech.

The API key needs access to the endpoints used for:

- Conversational AI / Agents
- Conversational AI read/write permissions, including `convai_read` at minimum
- Outbound phone calls
- Phone numbers / telephony integration
- Call history, transcripts, or conversation results, if available through API/webhooks

If ElevenLabs only shows granular categories, enable the category for Conversational AI / Agents. Basic Text to Speech alone is not enough for scheduled AI phone calls.

## Optional permissions

These are only needed if we build a custom voice pipeline later instead of using ElevenLabs Conversational AI end-to-end:

- Text to Speech
- Speech to Text
- Speech to Speech

For the MVP, prefer ElevenLabs Conversational AI + Twilio instead of building our own realtime STT → LLM → TTS pipeline.

## Twilio connection

Dailycall will need either:

- a Twilio phone number imported/connected into ElevenLabs, or
- a verified Twilio caller ID for outbound-only use, if ElevenLabs supports the intended flow.

The app will eventually store:

```env
VOICE_PROVIDER=elevenlabs_twilio
ELEVENLABS_API_KEY=
ELEVENLABS_AGENT_ID=
ELEVENLABS_AGENT_PHONE_NUMBER_ID=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=
```

## Current Dailycall IDs

```env
ELEVENLABS_AGENT_ID=agent_3101kr6wg7y3edw8f0d7b1y7jypm
ELEVENLABS_AGENT_PHONE_NUMBER_ID=phnum_6301kr6z8vmqfwj98njvcfczsyd8
TWILIO_FROM_NUMBER=+12362058677
```

The Twilio number has been imported into ElevenLabs and assigned to the Dailycall agent.

## First test target

Once local `.env` contains the real secret values, the first integration test should be:

1. Run the Next.js dev server.
2. Trigger one outbound test call to Matt's phone or a test number.
3. Use a short Dailycall check-in script.
4. Confirm transcript/call result is available.
5. Confirm Dailycall can classify outcome and generate caregiver text summary.

Example local test request:

```bash
curl -X POST http://localhost:3000/api/calls/outbound-test \
  -H "Content-Type: application/json" \
  -d '{"toNumber":"+15555555555","memberName":"Matt"}'
```

Do not call real elderly users until consent, retry rules, alert routing, and disclaimers are implemented.
