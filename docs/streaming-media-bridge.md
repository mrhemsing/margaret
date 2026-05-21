# Streaming Media Bridge Prototype

## Goal

Build a separate, test-only realtime voice gateway that keeps DailyCall's production calls on ElevenLabs while we evaluate:

Twilio bidirectional media stream -> realtime transcription / OpenAI text brain -> ElevenLabs streaming TTS -> Twilio audio playback.

## Non-goals

- Do not route dashboard or scheduled production calls through this bridge until it beats ElevenLabs on call quality and latency.
- Do not remove the existing ElevenLabs or OpenAI SIP paths.
- Do not use Twilio Gather/Play for the bridge; those are turn-based and too slow.

## Target Architecture

1. Twilio answers a test call and connects it to a WebSocket media stream.
2. The bridge receives Twilio `start`, `media`, `mark`, and `stop` events.
3. Incoming caller audio is decoded from Twilio phone audio frames and fed to a realtime STT path.
4. OpenAI produces short assistant text with DailyCall context and memory.
5. Text is streamed into ElevenLabs TTS WebSocket as tokens/sentences become available.
6. ElevenLabs audio chunks are transcoded into Twilio-compatible outbound media frames.
7. The bridge sends outbound `media`, `mark`, and `clear` events back to Twilio.
8. Barge-in clears current playback when the caller starts speaking.

## First Prototype Milestones

1. Echo skeleton: accept Twilio WebSocket, parse events, log timing, and keep the call alive.
2. Inbound audio metrics: count media frames, measure silence/speech timing, and confirm frame format.
3. One-shot playback: send a short generated ElevenLabs audio response back to Twilio through the stream.
4. Turn loop: realtime transcript -> OpenAI text -> ElevenLabs stream -> Twilio playback.
5. Barge-in: detect caller speech during playback and send Twilio `clear`.
6. Persistence: save transcript, provider timings, and raw diagnostic summaries on `CallAttempt`.

## Acceptance Bar

- First audio starts within about 1.5 seconds after the caller stops speaking.
- No mid-sentence clipping.
- Barge-in works without stuck silence.
- Transcript and timing diagnostics are saved.
- Dashboard Call Now remains on `elevenlabs_twilio` until explicitly switched.
