-- Add durable current-awareness briefing items for DB-only call-time context.
ALTER TABLE "Member" ADD COLUMN "weatherLocation" TEXT;
ALTER TABLE "SeniorMemory" ADD COLUMN "recentOpenerKeys" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "SeniorMemory" ADD COLUMN "interestTags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE TABLE "BriefingItem" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "interestTags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "text" TEXT NOT NULL,
    "tone" TEXT NOT NULL DEFAULT 'light',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "source" TEXT,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BriefingItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BriefingItem_expiresAt_idx" ON "BriefingItem"("expiresAt");
CREATE INDEX "BriefingItem_category_expiresAt_idx" ON "BriefingItem"("category", "expiresAt");
