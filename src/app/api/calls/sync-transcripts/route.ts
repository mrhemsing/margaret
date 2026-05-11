import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { sendExampleReportSmsToTeam } from "@/lib/sms/twilio";
import { deriveConversationInsights } from "@/lib/voice/conversation-insights";
import { formatConversationTranscript, getConversationDetails, mapConversationStatus } from "@/lib/voice/elevenlabs";

export async function POST() {
  const pendingCalls = await prisma.callAttempt.findMany({
    where: {
      providerConversationId: { not: null },
      OR: [{ transcript: null }, { status: "IN_PROGRESS" }, { reportSentAt: null }, { mood: null }],
    },
    orderBy: { createdAt: "asc" },
    take: 20,
  });

  const results = [];

  for (const call of pendingCalls) {
    try {
      const details = await getConversationDetails(call.providerConversationId!);
      const transcript = formatConversationTranscript(details.transcript);
      const summary = details.analysis?.transcript_summary ?? call.summary;
      const status = mapConversationStatus(details.status);

      const member = await prisma.member.findUnique({
        where: { id: call.memberId },
        include: { memory: true },
      });
      const insights = deriveConversationInsights({
        memberName: member?.name ?? "the call recipient",
        summary,
        transcript,
        priorRecentTopics: member?.memory?.recentTopics ?? [],
      });
      const isStuckInProgress = status === "IN_PROGRESS" && Boolean(call.startedAt) && Date.now() - call.startedAt!.getTime() > 15 * 60 * 1000;
      const finalStatus = isStuckInProgress ? "FAILED" : status;
      const finalSummary = isStuckInProgress
        ? "Call processing timed out after 15 minutes. Dailycall marked this attempt as failed so it does not linger in progress."
        : summary;
      const completedAt = finalStatus === "ANSWERED_OK" || finalStatus === "FAILED" ? call.completedAt ?? new Date() : call.completedAt;
      let smsResults: Awaited<ReturnType<typeof sendExampleReportSmsToTeam>> | null = null;
      let smsError: string | null = null;

      const shouldSendSms = Boolean(completedAt && !call.reportSentAt);

      if (shouldSendSms) {
        try {
          smsResults = await sendExampleReportSmsToTeam({
            memberName: member?.name ?? "the call recipient",
            status: finalStatus,
            summary: finalSummary,
          });
        } catch (error) {
          smsError = error instanceof Error ? error.message : "Unknown SMS notification error";
        }
      }

      if (member && completedAt) {
        const existingMemory = member.memory;
        const mergeList = (existing: string[] | undefined, incoming: string[], limit = 12) =>
          Array.from(new Set([...(existing ?? []), ...incoming].map((item) => item.trim()).filter(Boolean))).slice(0, limit);

        await prisma.seniorMemory.upsert({
          where: { memberId: member.id },
          create: {
            memberId: member.id,
            preferredName: member.name,
            hobbies: insights.memoryUpdates.possibleHobbies,
            routines: insights.memoryUpdates.possibleRoutines,
            healthNotes: insights.memoryUpdates.possibleHealthNotes,
            recentMood: insights.mood,
            topicsToRevisit: insights.memoryUpdates.topicsToRevisit,
            recentTopics: insights.memoryUpdates.recentTopics,
            lastSummary: insights.memoryUpdates.lastSummary,
          },
          update: {
            recentMood: insights.mood,
            topicsToRevisit: { set: mergeList(existingMemory?.topicsToRevisit, insights.memoryUpdates.topicsToRevisit) },
            recentTopics: { set: mergeList(insights.memoryUpdates.recentTopics, existingMemory?.recentTopics ?? [], 8) },
            lastSummary: insights.memoryUpdates.lastSummary,
            hobbies: { set: mergeList(existingMemory?.hobbies, insights.memoryUpdates.possibleHobbies) },
            routines: { set: mergeList(existingMemory?.routines, insights.memoryUpdates.possibleRoutines) },
            healthNotes: { set: mergeList(existingMemory?.healthNotes, insights.memoryUpdates.possibleHealthNotes) },
          },
        });
      }

      const updated = await prisma.callAttempt.update({
        where: { id: call.id },
        data: {
          status: finalStatus,
          completedAt,
          summary: finalSummary,
          transcript,
          mood: insights.mood,
          topics: insights.topics,
          notableMoments: insights.notableMoments,
          followUpSuggested: insights.followUpSuggested,
          followUpReason: insights.followUpReason,
          memoryUpdates: insights.memoryUpdates as Prisma.InputJsonValue,
          conversationRaw: details as Prisma.InputJsonValue,
          syncedAt: new Date(),
          reportSentAt: smsResults ? new Date() : call.reportSentAt,
        },
      });

      results.push({
        id: updated.id,
        ok: true,
        status: updated.status,
        timedOut: isStuckInProgress,
        hasTranscript: Boolean(updated.transcript),
        smsSent: Boolean(smsResults),
        smsResults,
        smsError,
      });
    } catch (error) {
      results.push({
        id: call.id,
        ok: false,
        error: error instanceof Error ? error.message : "Unknown transcript sync error",
      });
    }
  }

  return NextResponse.json({ ok: true, synced: results.length, results });
}
