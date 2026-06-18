ALTER TABLE "Member" ADD COLUMN "voiceMode" TEXT NOT NULL DEFAULT 'expressive';
ALTER TABLE "CallAttempt" ADD COLUMN "struggleSignal" TEXT;

CREATE INDEX "CallAttempt_struggleSignal_idx" ON "CallAttempt"("struggleSignal");
