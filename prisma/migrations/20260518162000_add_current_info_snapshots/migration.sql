-- CreateTable
CREATE TABLE "CurrentInfoSnapshot" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "title" TEXT,
    "summary" TEXT NOT NULL,
    "source" TEXT,
    "raw" JSONB,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CurrentInfoSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CurrentInfoSnapshot_key_key" ON "CurrentInfoSnapshot"("key");

-- CreateIndex
CREATE INDEX "CurrentInfoSnapshot_topic_expiresAt_idx" ON "CurrentInfoSnapshot"("topic", "expiresAt");
