-- AlterTable
ALTER TABLE "CallAttempt" ADD COLUMN     "retryAttempt" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "retryOfCallAttemptId" TEXT;

-- AlterTable
ALTER TABLE "Member" ADD COLUMN     "voicemailRetryCount" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "voicemailRetryDelayMins" INTEGER NOT NULL DEFAULT 15;
