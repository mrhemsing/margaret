-- AlterTable
ALTER TABLE "CallAttempt" ADD COLUMN     "followUpReason" TEXT,
ADD COLUMN     "followUpSuggested" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "memoryUpdates" JSONB,
ADD COLUMN     "mood" TEXT,
ADD COLUMN     "notableMoments" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "topics" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "SeniorMemory" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "preferredName" TEXT,
    "family" JSONB,
    "pets" JSONB,
    "hobbies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "routines" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "preferences" JSONB,
    "healthNotes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "conversationLikes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "conversationAvoids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "recentMood" TEXT,
    "topicsToRevisit" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "recentTopics" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "lastSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeniorMemory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SeniorMemory_memberId_key" ON "SeniorMemory"("memberId");

-- AddForeignKey
ALTER TABLE "SeniorMemory" ADD CONSTRAINT "SeniorMemory_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
