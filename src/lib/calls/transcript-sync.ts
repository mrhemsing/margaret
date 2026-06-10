import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { ensureUpcomingScheduledCalls } from "@/lib/calls/scheduling";
import { prisma } from "@/lib/db";
import { sendCallReportSmsToAlertContacts } from "@/lib/sms/twilio";
import { deriveConversationInsights, summarizeConversationForFamily } from "@/lib/voice/conversation-insights";
import { formatConversationTranscript, getConversationDetails, getConversationTiming, mapConversationStatus } from "@/lib/voice/elevenlabs";

function hasUserTranscriptTurn(transcript: Array<{ role?: string; message?: string | null; text?: string | null }> | undefined) {
  return Boolean(
    transcript?.some((turn) => {
      const text = turn.message ?? turn.text ?? "";
      return turn.role === "user" && text.trim().length > 0;
    }),
  );
}

function hasUserAudio(details: Record<string, unknown>) {
  return details.has_user_audio === true;
}

export async function syncTranscripts() {
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
      if (call.providerConversationId?.startsWith("rtc_")) {
        const member = await prisma.member.findUnique({
          where: { id: call.memberId },
          include: { memory: true, customer: { include: { alertContacts: true } } },
        });
        const isDemoCall = member?.customer.email === "demo-family@dailycall.local" || member?.preferredCallTime === "Landing page demo";
        const transcript = call.transcript ?? "";
        const finalSummary = transcript
          ? summarizeConversationForFamily({
              memberName: member?.name ?? "the call recipient",
              summary: call.summary,
              transcript,
            })
          : call.summary;
        const insights = deriveConversationInsights({
          memberName: member?.name ?? "the call recipient",
          summary: finalSummary,
          transcript,
          priorRecentTopics: member?.memory?.recentTopics ?? [],
        });
        const isStuckInProgress = call.status === "IN_PROGRESS" && Boolean(call.startedAt) && Date.now() - call.startedAt!.getTime() > 15 * 60 * 1000;
        const finalStatus = isStuckInProgress ? "FAILED" : call.status === "IN_PROGRESS" ? "IN_PROGRESS" : call.status;
        const completedAt = ["ANSWERED_OK", "FAILED", "NO_RESPONSE"].includes(finalStatus) ? call.completedAt ?? new Date() : call.completedAt;
        let smsResults: Awaited<ReturnType<typeof sendCallReportSmsToAlertContacts>> | null = null;
        let smsError: string | null = null;

        if (completedAt && !call.reportSentAt) {
          try {
            smsResults = await sendCallReportSmsToAlertContacts({
              alertContacts: member?.customer.alertContacts ?? [],
              memberName: member?.name ?? "the call recipient",
              status: finalStatus,
              summary: finalSummary,
              isDemo: isDemoCall,
            });
          } catch (error) {
            smsError = error instanceof Error ? error.message : "Unknown SMS notification error";
          }
        }

        if (member && completedAt && transcript) {
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
              topicsToRevisit: [],
              recentTopics: insights.memoryUpdates.recentTopics,
              lastSummary: insights.memoryUpdates.lastSummary,
            },
            update: {
              recentMood: insights.mood,
              recentTopics: { set: mergeList(insights.memoryUpdates.recentTopics, existingMemory?.recentTopics ?? [], 8) },
              lastSummary: insights.memoryUpdates.lastSummary,
              hobbies: { set: mergeList(existingMemory?.hobbies, insights.memoryUpdates.possibleHobbies) },
              routines: { set: mergeList(existingMemory?.routines, insights.memoryUpdates.possibleRoutines) },
              healthNotes: { set: mergeList(existingMemory?.healthNotes, insights.memoryUpdates.possibleHealthNotes) },
            },
          });
        }

        if (member && completedAt && !isDemoCall) {
          await ensureUpcomingScheduledCalls(prisma, [member]);
        }

        const updated = await prisma.callAttempt.update({
          where: { id: call.id },
          data: {
            status: finalStatus,
            completedAt,
            summary: finalSummary,
            mood: transcript ? insights.mood : call.mood,
            topics: transcript ? insights.topics : call.topics,
            notableMoments: transcript ? insights.notableMoments : call.notableMoments,
            followUpSuggested: transcript ? insights.followUpSuggested : call.followUpSuggested,
            followUpReason: transcript ? insights.followUpReason : call.followUpReason,
            memoryUpdates: transcript ? (insights.memoryUpdates as Prisma.InputJsonValue) : call.memoryUpdates ?? undefined,
            syncedAt: new Date(),
            reportSentAt: smsResults?.length ? new Date() : call.reportSentAt,
          },
        });

        results.push({
          id: updated.id,
          ok: true,
          provider: "openai_realtime",
          status: updated.status,
          timedOut: isStuckInProgress,
          hasTranscript: Boolean(updated.transcript),
          smsSent: Boolean(smsResults?.length),
          smsResults,
          smsError,
        });
        continue;
      }

      const details = await getConversationDetails(call.providerConversationId!);
      const summary = details.analysis?.transcript_summary ?? call.summary;
      const status = mapConversationStatus(details.status);
      const timing = getConversationTiming(details);
      const hasUserResponse = hasUserTranscriptTurn(details.transcript) || hasUserAudio(details);

      const member = await prisma.member.findUnique({
        where: { id: call.memberId },
        include: { memory: true, customer: { include: { alertContacts: true } } },
      });
      const isDemoCall = member?.customer.email === "demo-family@dailycall.local" || member?.preferredCallTime === "Landing page demo";
      const transcript = formatConversationTranscript(details.transcript, member?.name ?? "Member");
      const insights = deriveConversationInsights({
        memberName: member?.name ?? "the call recipient",
        summary,
        transcript,
        priorRecentTopics: member?.memory?.recentTopics ?? [],
      });
      const isStuckInProgress = status === "IN_PROGRESS" && Boolean(call.startedAt) && Date.now() - call.startedAt!.getTime() > 15 * 60 * 1000;
      const isCompletedWithoutUserResponse = status === "ANSWERED_OK" && !hasUserResponse;
      const finalStatus = isStuckInProgress ? "FAILED" : isCompletedWithoutUserResponse ? "NO_RESPONSE" : status;
      const finalSummary = isStuckInProgress
        ? "Call processing timed out after 15 minutes. DailyCall marked this attempt as failed so it does not linger in progress."
        : isCompletedWithoutUserResponse
          ? "DailyCall reached voicemail or did not capture a live response. No check-in conversation was completed."
        : summary;
      const completedAt = ["ANSWERED_OK", "FAILED", "NO_RESPONSE"].includes(finalStatus) ? timing.completedAt ?? call.completedAt ?? new Date() : call.completedAt;
      let smsResults: Awaited<ReturnType<typeof sendCallReportSmsToAlertContacts>> | null = null;
      let smsError: string | null = null;

      const shouldSendSms = Boolean(completedAt && !call.reportSentAt);

      if (shouldSendSms) {
        try {
          smsResults = await sendCallReportSmsToAlertContacts({
            alertContacts: member?.customer.alertContacts ?? [],
            memberName: member?.name ?? "the call recipient",
            status: finalStatus,
            summary: finalSummary,
            isDemo: isDemoCall,
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
            topicsToRevisit: [],
            recentTopics: insights.memoryUpdates.recentTopics,
            lastSummary: insights.memoryUpdates.lastSummary,
          },
          update: {
            recentMood: insights.mood,
            recentTopics: { set: mergeList(insights.memoryUpdates.recentTopics, existingMemory?.recentTopics ?? [], 8) },
            lastSummary: insights.memoryUpdates.lastSummary,
            hobbies: { set: mergeList(existingMemory?.hobbies, insights.memoryUpdates.possibleHobbies) },
            routines: { set: mergeList(existingMemory?.routines, insights.memoryUpdates.possibleRoutines) },
            healthNotes: { set: mergeList(existingMemory?.healthNotes, insights.memoryUpdates.possibleHealthNotes) },
          },
        });
      }

      if (member && completedAt && !isDemoCall) {
        await ensureUpcomingScheduledCalls(prisma, [member]);
      }

      const updated = await prisma.callAttempt.update({
        where: { id: call.id },
        data: {
          status: finalStatus,
          startedAt: timing.startedAt ?? call.startedAt,
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
          reportSentAt: smsResults?.length ? new Date() : call.reportSentAt,
        },
      });

      results.push({
        id: updated.id,
        ok: true,
        status: updated.status,
        timedOut: isStuckInProgress,
        hasTranscript: Boolean(updated.transcript),
        smsSent: Boolean(smsResults?.length),
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

export async function GET() {
  return syncTranscripts();
}

export async function POST() {
  return syncTranscripts();
}
