import type { PrismaClient } from "@prisma/client";

import { sendMemberOptOutSmsToAlertContacts } from "@/lib/sms/twilio";

const optOutPatterns = [
  /\bstop calling me\b/i,
  /\bdon'?t call (me )?(again|anymore|any more)\b/i,
  /\bi don'?t want (these|the|your)?\s*(daily)?\s*calls\b/i,
  /\bi don'?t want (to get|to receive)?\s*(these|the|your)?\s*calls\b/i,
  /\btake me off (your|the) (list|call list)\b/i,
  /\bremove me from (your|the) (list|call list)\b/i,
  /\bleave me alone\b/i,
  /\bcancel (these|the|my)?\s*(daily)?\s*calls\b/i,
  /\bend (these|the|my)?\s*(daily)?\s*calls\b/i,
  /\bquit calling me\b/i,
];

const oneOffDeclinePattern = /\b(not today|busy today|call me later|don'?t want to talk (right now|today)|i'?m busy|goodbye|bye)\b/i;

function normalizeEvidence(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, 240);
}

export function getMemberTranscriptText(transcript: string, memberName: string) {
  const memberNamePattern = new RegExp(`^${memberName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}:\\s*(.+)$`, "i");

  return transcript
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) => {
      const speakerMatch = line.match(/^([^:]{1,80}):\s*(.+)$/);
      if (!speakerMatch) return [];

      const speaker = speakerMatch[1].trim();
      const text = speakerMatch[2].trim();
      if (/^DailyCall$/i.test(speaker)) return [];
      if (memberNamePattern.test(line) || speaker.toLowerCase() !== "dailycall") return [text];
      return [];
    })
    .join("\n");
}

export function detectMemberOptOut(input: { transcript?: string | null; memberName: string }) {
  const memberText = getMemberTranscriptText(input.transcript ?? "", input.memberName);
  if (!memberText.trim()) return null;

  for (const pattern of optOutPatterns) {
    const match = memberText.match(pattern);
    if (!match?.[0]) continue;

    const evidence = normalizeEvidence(match[0]);
    if (oneOffDeclinePattern.test(evidence) && !/call|list|alone/i.test(evidence)) continue;

    return {
      evidence,
      memberText: normalizeEvidence(memberText),
    };
  }

  return null;
}

export async function pauseMemberForVoiceOptOut(
  prisma: PrismaClient,
  input: {
    memberId: string;
    evidence: string;
    now?: Date;
  },
) {
  const now = input.now ?? new Date();
  const member = await prisma.member.findUnique({
    where: { id: input.memberId },
    include: { customer: { include: { alertContacts: true } } },
  });

  if (!member || member.callsPaused) {
    return { paused: false, smsResults: [], smsError: null };
  }

  const updated = await prisma.member.update({
    where: { id: member.id },
    data: {
      active: false,
      callsPaused: true,
      callPausedUntil: null,
      optOutRequestedAt: now,
      optOutEvidence: input.evidence,
      optOutCount: { increment: 1 },
    },
  });

  await prisma.callAttempt.updateMany({
    where: {
      memberId: member.id,
      status: "SCHEDULED",
      scheduledFor: { gte: now },
    },
    data: {
      status: "FAILED",
      completedAt: now,
      summary: "Canceled scheduled call because the member asked DailyCall to stop calling.",
      syncedAt: now,
    },
  });

  await prisma.consentEvent.create({
    data: {
      customerId: member.customerId,
      memberId: member.id,
      type: "paused_by_member",
      actor: "member_voice",
      note: input.evidence,
    },
  });

  let smsResults: Awaited<ReturnType<typeof sendMemberOptOutSmsToAlertContacts>> = [];
  let smsError: string | null = null;

  try {
    smsResults = await sendMemberOptOutSmsToAlertContacts({
      alertContacts: member.customer.alertContacts,
      memberName: member.name,
      evidence: input.evidence,
    });
  } catch (error) {
    smsError = error instanceof Error ? error.message : "Unknown opt-out SMS error";
  }

  return { paused: true, member: updated, smsResults, smsError };
}
