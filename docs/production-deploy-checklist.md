# Production Deploy Checklist

Use this before deploying schema-backed call changes.

## Database migrations

- Any `prisma/schema.prisma` change must have a matching migration in `prisma/migrations`.
- Production deploys must run `npx prisma migrate deploy` before `prisma generate` and `next build`.
- Vercel production builds need both `DATABASE_URL` and `DIRECT_URL`; `DIRECT_URL` must be the non-pooled database connection Prisma can use for migrations.
- Before smoke tests, confirm migration status against production:

```shell
npx prisma migrate status
npx prisma migrate deploy
```

`migrate deploy` applies only pending migrations. If a live page throws a missing-column Prisma error after a deploy, check migration status before debugging application code.

## Current call-context launch checks

- ElevenLabs saved agent first message is exactly `{{opener}}`.
- ElevenLabs turn-taking is patient/balanced, speculative turn is off or actively being A/B tested, and `turn_timeout` is about 7s.
- ElevenLabs default `tts.speed` is about `0.95`, and `conversation_config_override.tts.speed` is enabled before using member speech-speed overrides.
- ElevenLabs production TTS model matches `productionElevenLabsTtsModel` in `src/lib/voice/voice-options.ts`.
- Run the current-info refresh once after deploying briefing changes.
- Backfill existing member `SeniorMemory.interestTags` after deploying interest matching changes.
- Smoke-test the admin test call buttons against production after migrations finish.
