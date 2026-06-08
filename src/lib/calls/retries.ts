import type { PrismaClient } from "@prisma/client";

function isDemoCall(member: { preferredCallTime: string; customer: { email: string | null } }) {
  return member.customer.email === "demo-family@dailycall.local" || member.preferredCallTime === "Landing page demo";
}

export async function scheduleNoResponseRetry(prisma: PrismaClient, input: { callAttemptId: string; now?: Date }) {
  const now = input.now ?? new Date();
  const callAttempt = await prisma.callAttempt.findUnique({
    where: { id: input.callAttemptId },
    include: {
      member: {
        include: {
          customer: {
            select: { email: true },
          },
        },
      },
    },
  });

  if (!callAttempt) {
    return { callAttempt: null, retryScheduledFor: null };
  }

  const retryAttempt = callAttempt.retryAttempt;
  const retryLimit = isDemoCall(callAttempt.member) ? 0 : callAttempt.member.voicemailRetryCount;
  const retryDelayMins = callAttempt.member.voicemailRetryDelayMins;

  if (retryAttempt >= retryLimit) {
    return { callAttempt, retryScheduledFor: null, retryAttempt, retryLimit, retryDelayMins };
  }

  const existingRetry = await prisma.callAttempt.findFirst({
    where: {
      retryOfCallAttemptId: callAttempt.id,
      status: "SCHEDULED",
    },
  });

  if (existingRetry) {
    return { callAttempt, retryScheduledFor: existingRetry.scheduledFor, retryAttempt, retryLimit, retryDelayMins };
  }

  const retryScheduledFor = new Date(now.getTime() + retryDelayMins * 60 * 1000);

  await prisma.callAttempt.create({
    data: {
      memberId: callAttempt.memberId,
      scheduledFor: retryScheduledFor,
      status: "SCHEDULED",
      retryAttempt: retryAttempt + 1,
      retryOfCallAttemptId: callAttempt.id,
      summary: `Retry ${retryAttempt + 1} of ${retryLimit} scheduled after no answer.`,
    },
  });

  return { callAttempt, retryScheduledFor, retryAttempt, retryLimit, retryDelayMins };
}

export function formatRetryScheduledSummary(input: { summary: string; retryScheduledFor: Date | null; timeZone?: string | null }) {
  if (!input.retryScheduledFor) return input.summary;

  const retryTime = input.retryScheduledFor.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: input.timeZone ?? "America/Los_Angeles",
  });

  return `${input.summary} Retry scheduled for ${retryTime}.`;
}
