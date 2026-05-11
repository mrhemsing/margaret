-- AlterTable
ALTER TABLE "CallAttempt" ADD COLUMN     "conversationRaw" JSONB,
ADD COLUMN     "syncedAt" TIMESTAMP(3),
ADD COLUMN     "transcript" TEXT;
