ALTER TABLE "Customer" ADD COLUMN "consentLastRefreshedAt" TIMESTAMP(3);

ALTER TABLE "Member"
  ADD COLUMN "callsPaused" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "optOutRequestedAt" TIMESTAMP(3),
  ADD COLUMN "optOutEvidence" TEXT,
  ADD COLUMN "optOutCount" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "ConsentEvent" (
  "id" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "memberId" TEXT,
  "type" TEXT NOT NULL,
  "actor" TEXT NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ConsentEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ConsentEvent_customerId_createdAt_idx" ON "ConsentEvent"("customerId", "createdAt");
CREATE INDEX "ConsentEvent_memberId_createdAt_idx" ON "ConsentEvent"("memberId", "createdAt");
CREATE INDEX "ConsentEvent_type_createdAt_idx" ON "ConsentEvent"("type", "createdAt");

ALTER TABLE "ConsentEvent" ADD CONSTRAINT "ConsentEvent_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConsentEvent" ADD CONSTRAINT "ConsentEvent_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;
