# DailyCall Call 100 Memory Audit

Date: 2026-06-09
Status: first local audit pass

## Current Flow

### 1. Signup and dashboard setup

Initial family-provided memory is stored in `SeniorMemory`.

Current fields:
- `preferredName`
- `family`
- `pets`
- `hobbies`
- `routines`
- `preferences`
- `healthNotes`
- `conversationLikes`
- `conversationAvoids`
- `recentMood`
- `topicsToRevisit`
- `recentTopics`
- `lastSummary`

Family custom questions update `topicsToRevisit` through the dashboard member PATCH route.

### 2. Call start

Manual and scheduled product calls go through Twilio AMD before the AI joins.

On live answer, the AMD route:
- loads the `CallAttempt`
- includes the member's `SeniorMemory`
- loads up to five previous call attempts with summaries
- builds companion context with `buildCompanionContext`
- injects context into ElevenLabs dynamic variables

OpenAI Realtime calls use the same `buildCompanionContext` path from the Realtime webhook.

### 3. During the call

OpenAI Realtime monitor persists transcript turns and realtime metrics into `CallAttempt.conversationRaw`.

Current metrics include:
- first audio delta
- speech stopped timestamps
- speech-stop-to-response-created timings
- speech-stop-to-first-audio timings
- speech started/stopped counts
- manual/auto response counts
- error count

ElevenLabs calls rely on the provider conversation details during transcript sync.

### 4. Post-call sync

`/api/calls/sync-transcripts` derives:
- family summary
- mood
- topics
- notable moments
- follow-up suggested
- follow-up reason
- memory updates

Then it updates `CallAttempt` and upserts `SeniorMemory`.

### 5. Next-call retrieval

The next call receives:
- recent mood
- hobbies
- routines
- health/context notes
- topics to revisit
- recent topics
- current small-talk context
- up to three recent summaries
- avoid-repeating guidance generated from recent summaries/topics

## What Is Working

- Memory is not just raw transcripts. There is a structured `SeniorMemory` row.
- Recent topics and recent summaries are actively used to reduce repetition.
- Product call paths share the same companion context builder.
- OpenAI Realtime already records latency-oriented metrics needed for voice quality KPI work.
- Family dashboard receives 90 call attempts with memory included, which is enough for trend UI.

## Call 100 Weak Spots

### 1. Extracted memories are too generic

Current extraction stores labels such as:
- `Mentioned hobbies or regular activities`
- `Mentioned daily routine`
- `Mentioned health context`

Those labels do not preserve the actual content. By call 100, DailyCall may know that hobbies exist without knowing which hobby matters.

### 2. No source, confidence, or freshness metadata

Memory fields do not track:
- which call produced the memory
- first heard date
- last confirmed date
- confidence
- sensitivity
- whether the memory was used recently

This makes contradictions and stale facts hard to manage.

### 3. Contradictions are not handled

List merging preserves old and new facts without an explicit supersede/archive path.

Example risk:
- Call 12: "I live alone."
- Call 60: "My daughter moved in."
- Call 100: prompt may still carry both facts without knowing which is current.

### 4. `topicsToRevisit` is underused for extracted call memories

Post-call insights derive `topicsToRevisit`, but sync currently creates and updates `SeniorMemory.topicsToRevisit` as an empty array for extracted insights. Family-set questions survive, but app-derived revisit topics are not accumulated.

### 5. Recent summary depth is shallow

Only one `lastSummary` is stored on `SeniorMemory`, and `buildCompanionContext` compensates by querying the five most recent calls. This works locally, but there is no explicit durable "last five summaries" memory field.

### 6. Family visibility is incomplete

Dashboard data includes memory and call attempts, but there is no dedicated "Memory captured" review/edit/control surface yet.

### 7. Privacy controls are not memory-specific

There are `conversationAvoids`, but no per-memory "forget this," "do not mention," or "family-visible/private" control.

## Immediate Ranking

1. Fix memory extraction so it captures concrete facts, not labels.
2. Preserve app-derived `topicsToRevisit` instead of dropping them during sync.
3. Add a call-100 benchmark fixture before expanding schema.
4. Add memory metadata and contradiction handling in the next schema pass.
5. Add dashboard visibility/edit/delete controls after the model supports it.

## Minimum Call 100 Bar

At call 100, DailyCall should be able to answer:
- Who are the important people in this senior's life?
- What routines and hobbies reliably matter?
- What should be avoided or handled gently?
- What did they talk about recently?
- What should not be repeated?
- What has changed since earlier calls?
- What should the family see, and what should stay private?

Current verdict: **promising MVP foundation, not yet a compounding memory system.**
