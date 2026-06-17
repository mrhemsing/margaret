-- Voice quality controls and post-call scoring/observability.
ALTER TABLE "Member" ADD COLUMN "speechSpeed" DOUBLE PRECISION;

ALTER TABLE "CallAttempt" ADD COLUMN "qualityScores" JSONB;
ALTER TABLE "CallAttempt" ADD COLUMN "openerKey" TEXT;
ALTER TABLE "CallAttempt" ADD COLUMN "briefingItemIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE INDEX "CallAttempt_openerKey_idx" ON "CallAttempt"("openerKey");
