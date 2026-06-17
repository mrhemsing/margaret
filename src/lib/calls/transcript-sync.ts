import { NextResponse } from "next/server";
import type { CallAttemptStatus, Prisma } from "@prisma/client";
import { ensureUpcomingScheduledCalls } from "@/lib/calls/scheduling";
import { prisma } from "@/lib/db";
import { sendCallReportSmsToAlertContacts, sendCareAlertSmsToAlertContacts } from "@/lib/sms/twilio";
import type { CareAssessment } from "@/lib/voice/care-classifier";
import { assessCallConcern } from "@/lib/voice/care-classifier";
import { deriveInterestTags } from "@/lib/voice/current-info";
import { deriveConversationInsights, summarizeConversationForFamily } from "@/lib/voice/conversation-insights";
import { formatConversationTranscript, getConversationDetails, getConversationTiming, mapConversationStatus } from "@/lib/voice/elevenlabs";
import { extractOpenThreads } from "@/lib/voice/memory-threads";

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

function isTerminalCompletedStatus(status: string | null | undefined) {
  return status === "ANSWERED_OK" || status === "HELP_REQUESTED" || status === "FOLLOW_UP_NEEDED";
}

function hasConversationTranscript(transcript: string | null | undefined) {
  if (!transcript?.trim()) return false;

  const speakerLines = transcript
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.match(/^([^:]{1,80}):\s*(.+)$/))
    .filter((match): match is RegExpMatchArray => Boolean(match?.[1] && match?.[2]));

  const hasDailyCallTurn = speakerLines.some((line) => /^DailyCall$/i.test(line[1].trim()));
  const hasMemberTurn = speakerLines.some((line) => !/^DailyCall$/i.test(line[1].trim()) && line[2].trim().length > 0);

  return hasDailyCallTurn && hasMemberTurn;
}

function shouldUseTranscriptSummary(summary: string | null | undefined) {
  return !summary || /could not be connected|couldn't connect|carrier issue|did not capture a live response|voicemail|no answer|failed|timed out|being placed|started|chatting with them now/i.test(summary);
}

function mergeList(existing: string[] | undefined, incoming: string[], limit = 12) {
  return Array.from(new Set([...(incoming ?? []), ...(existing ?? [])].map((item) => item.trim()).filter(Boolean))).slice(0, limit);
}

function getRawObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function getCareAssessmentRaw(value: unknown) {
  const raw = getRawObject(value);
  return getRawObject(raw.careAssessment);
}

function getCareCategory(value: unknown) {
  const assessment = getCareAssessmentRaw(value);
  return typeof assessment.category === "string" ? assessment.category : null;
}

async function hasRecurringConcern(memberId: string, currentCallId: string, category: string | null) {
  if (!category) return false;

  const recentCalls = await prisma.callAttempt.findMany({
    where: {
      memberId,
      id: { not: currentCallId },
      completedAt: { not: null },
    },
    orderBy: { completedAt: "desc" },
    take: 3,
    select: { conversationRaw: true },
  });

  const priorMatches = recentCalls.filter((call) => getCareCategory(call.conversationRaw) === category).length;
  return priorMatches >= 2;
}

function applyCareStatus(baseStatus: CallAttemptStatus, assessment: CareAssessment, concernEscalates: boolean): CallAttemptStatus {
  if (assessment.severity === "urgent") return "HELP_REQUESTED";
  if (assessment.severity === "concern" || concernEscalates) return "FOLLOW_UP_NEEDED";
  return baseStatus;
}

function getCareFollowUpReason(assessment: CareAssessment, concernEscalates: boolean) {
  if (assessment.severity === "urgent") {
    return assessment.evidence ?? `Urgent care concern${assessment.category ? `: ${assessment.category}` : ""}.`;
  }

  if (assessment.severity === "concern") {
    const reason = assessment.evidence ?? `Care concern${assessment.category ? `: ${assessment.category}` : ""}.`;
    return concernEscalates ? `${reason} This concern has repeated across recent calls.` : reason;
  }

  return null;
}

function appendCareReportLine(summary: string | null | undefined, assessment: CareAssessment, concernEscalates: boolean) {
  const base = summary?.trim() || "DailyCall completed the check-in.";
  if (assessment.severity === "none") return base;

  if (assessment.severity === "urgent") {
    return `${base} DailyCall also sent an urgent family alert for a possible safety concern.`;
  }

  if (concernEscalates) {
    return `${base} DailyCall also sent a care alert because this concern has repeated across recent calls.`;
  }

  return `${base} DailyCall noticed a gentle wellbeing signal${assessment.category ? ` around ${assessment.category}` : ""}; no urgent alert was sent.`;
}

export async function syncTranscripts() {
  const inProgressCalls = await prisma.callAttempt.findMany({
    where: {
      providerConversationId: { not: null },
      status: "IN_PROGRESS",
    },
    orderBy: { createdAt: "asc" },
    take: 20,
  });
  const remainingLimit = Math.max(20 - inProgressCalls.length, 0);
  const followUpCalls = remainingLimit
    ? await prisma.callAttempt.findMany({
        where: {
          providerConversationId: { not: null },
          id: { notIn: inProgressCalls.map((call) => call.id) },
          OR: [{ transcript: null }, { reportSentAt: null }, { mood: null }],
        },
        orderBy: { createdAt: "asc" },
        take: remainingLimit,
      })
    : [];
  const pendingCalls = [...inProgressCalls, ...followUpCalls];

  /*
   * In-progress provider conversations are user-visible as "still happening",
   * so they get first claim on each sync run. Older report/SMS follow-ups
   * should not block recent completed demos from settling.
   */
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
        const hasConversation = hasConversationTranscript(transcript);
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
        const baseStatus = hasConversation
          ? isTerminalCompletedStatus(call.status)
            ? call.status
            : "ANSWERED_OK"
          : isStuckInProgress ? "FAILED" : call.status === "IN_PROGRESS" ? "IN_PROGRESS" : call.status;
        const baseCompletedAt = ["ANSWERED_OK", "FAILED", "NO_RESPONSE", "HELP_REQUESTED", "FOLLOW_UP_NEEDED"].includes(baseStatus) ? call.completedAt ?? new Date() : call.completedAt;
        const careAssessment = member && baseCompletedAt && transcript && hasConversation
          ? await assessCallConcern({
              transcript,
              memberName: member.name,
            })
          : null;
        const concernEscalates = member && careAssessment?.severity === "concern"
          ? await hasRecurringConcern(member.id, call.id, careAssessment.category)
          : false;
        const finalStatus = careAssessment ? applyCareStatus(baseStatus as CallAttemptStatus, careAssessment, concernEscalates) : baseStatus;
        const completedAt = ["ANSWERED_OK", "FAILED", "NO_RESPONSE", "HELP_REQUESTED", "FOLLOW_UP_NEEDED"].includes(finalStatus) ? baseCompletedAt ?? new Date() : call.completedAt;
        const reportSummary = careAssessment ? appendCareReportLine(finalSummary, careAssessment, concernEscalates) : finalSummary;
        const openThreads = member && completedAt && transcript
          ? await extractOpenThreads({
              transcript,
              memberName: member.name,
              priorThreads: member.memory?.topicsToRevisit ?? [],
            })
          : [];
        let smsResults: Awaited<ReturnType<typeof sendCallReportSmsToAlertContacts>> | null = null;
        let smsError: string | null = null;
        let careAlertResults: Awaited<ReturnType<typeof sendCareAlertSmsToAlertContacts>> | null = null;
        let careAlertError: string | null = null;
        const shouldSendCareAlert = Boolean(
          member &&
          completedAt &&
          careAssessment &&
          (careAssessment.severity === "urgent" || concernEscalates) &&
          !call.alertSentAt &&
          !isDemoCall,
        );

        if (shouldSendCareAlert && member && careAssessment) {
          try {
            careAlertResults = await sendCareAlertSmsToAlertContacts({
              alertContacts: member.customer.alertContacts,
              memberName: member.name,
              severity: careAssessment.severity === "urgent" ? "urgent" : "concern",
              category: careAssessment.category,
              evidence: careAssessment.evidence,
              selfHarm: careAssessment.selfHarm,
              isDemo: isDemoCall,
            });
          } catch (error) {
            careAlertError = error instanceof Error ? error.message : "Unknown care alert SMS error";
          }
        }

        if (completedAt && !call.reportSentAt) {
          try {
            smsResults = await sendCallReportSmsToAlertContacts({
              alertContacts: member?.customer.alertContacts ?? [],
              memberName: member?.name ?? "the call recipient",
              status: finalStatus,
              summary: reportSummary,
              isDemo: isDemoCall,
            });
          } catch (error) {
            smsError = error instanceof Error ? error.message : "Unknown SMS notification error";
          }
        }

        if (member && completedAt && transcript) {
          const existingMemory = member.memory;
          const threadTexts = openThreads.map((thread) => thread.text);
          const interestTags = deriveInterestTags([
            ...(existingMemory?.interestTags ?? []),
            ...insights.memoryUpdates.possibleHobbies,
            ...insights.memoryUpdates.recentTopics,
          ]);

          await prisma.seniorMemory.upsert({
            where: { memberId: member.id },
            create: {
              memberId: member.id,
              preferredName: member.name,
              hobbies: insights.memoryUpdates.possibleHobbies,
              interestTags,
              routines: insights.memoryUpdates.possibleRoutines,
              healthNotes: insights.memoryUpdates.possibleHealthNotes,
              recentMood: insights.mood,
              topicsToRevisit: mergeList([], threadTexts.length ? threadTexts : insights.memoryUpdates.topicsToRevisit, 6),
              recentTopics: insights.memoryUpdates.recentTopics,
              lastSummary: insights.memoryUpdates.lastSummary,
            },
            update: {
              recentMood: insights.mood,
              recentTopics: { set: mergeList(insights.memoryUpdates.recentTopics, existingMemory?.recentTopics ?? [], 8) },
              topicsToRevisit: { set: mergeList(existingMemory?.topicsToRevisit, threadTexts.length ? threadTexts : insights.memoryUpdates.topicsToRevisit, 6) },
              lastSummary: insights.memoryUpdates.lastSummary,
              interestTags: { set: interestTags },
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
            summary: reportSummary,
            mood: transcript ? insights.mood : call.mood,
            topics: transcript ? insights.topics : call.topics,
            notableMoments: transcript ? insights.notableMoments : call.notableMoments,
            followUpSuggested: transcript ? Boolean(insights.followUpSuggested || (careAssessment && careAssessment.severity !== "none")) : call.followUpSuggested,
            followUpReason: careAssessment && careAssessment.severity !== "none"
              ? getCareFollowUpReason(careAssessment, concernEscalates)
              : transcript ? insights.followUpReason : call.followUpReason,
            memoryUpdates: transcript ? (insights.memoryUpdates as Prisma.InputJsonValue) : call.memoryUpdates ?? undefined,
            conversationRaw: {
              ...getRawObject(call.conversationRaw),
              careAssessment,
              careAlertSent: Boolean(careAlertResults?.length),
              careAlertResults,
              careAlertError,
            } as Prisma.InputJsonValue,
            syncedAt: new Date(),
            reportSentAt: smsResults?.length ? new Date() : call.reportSentAt,
            alertSentAt: careAlertResults?.length ? new Date() : call.alertSentAt,
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
          careAlertSent: Boolean(careAlertResults?.length),
          smsResults,
          smsError,
          careAlertResults,
          careAlertError,
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
      const hasConversation = Boolean(hasUserResponse && hasConversationTranscript(transcript));
      const transcriptSummary = transcript && (hasConversation || shouldUseTranscriptSummary(summary))
        ? summarizeConversationForFamily({
            memberName: member?.name ?? "the call recipient",
            summary,
            transcript,
          })
        : summary;
      const insights = deriveConversationInsights({
        memberName: member?.name ?? "the call recipient",
        summary: transcriptSummary,
        transcript,
        priorRecentTopics: member?.memory?.recentTopics ?? [],
      });
      const isStuckInProgress = status === "IN_PROGRESS" && Boolean(call.startedAt) && Date.now() - call.startedAt!.getTime() > 15 * 60 * 1000;
      const isCompletedWithoutUserResponse = status === "ANSWERED_OK" && !hasUserResponse;
        const baseStatus = hasConversation
          ? isTerminalCompletedStatus(status)
            ? status
            : "ANSWERED_OK"
          : isStuckInProgress ? "FAILED" : isCompletedWithoutUserResponse ? "NO_RESPONSE" : status;
      const baseSummary = isStuckInProgress
        ? hasConversation
          ? transcriptSummary
          : "Call processing timed out after 15 minutes. DailyCall marked this attempt as failed so it does not linger in progress."
        : isCompletedWithoutUserResponse
          ? "DailyCall reached voicemail or did not capture a live response. No check-in conversation was completed."
          : transcriptSummary;
      const baseCompletedAt = ["ANSWERED_OK", "FAILED", "NO_RESPONSE", "HELP_REQUESTED", "FOLLOW_UP_NEEDED"].includes(baseStatus) ? timing.completedAt ?? call.completedAt ?? new Date() : call.completedAt;
      const careAssessment = member && baseCompletedAt && transcript && hasConversation
        ? await assessCallConcern({
            transcript,
            memberName: member.name,
          })
        : null;
      const concernEscalates = member && careAssessment?.severity === "concern"
        ? await hasRecurringConcern(member.id, call.id, careAssessment.category)
        : false;
      const finalStatus = careAssessment ? applyCareStatus(baseStatus as CallAttemptStatus, careAssessment, concernEscalates) : baseStatus;
      const finalSummary = careAssessment ? appendCareReportLine(baseSummary, careAssessment, concernEscalates) : baseSummary;
      const completedAt = ["ANSWERED_OK", "FAILED", "NO_RESPONSE", "HELP_REQUESTED", "FOLLOW_UP_NEEDED"].includes(finalStatus) ? baseCompletedAt ?? new Date() : call.completedAt;
      const openThreads = member && completedAt && transcript
        ? await extractOpenThreads({
            transcript,
            memberName: member.name,
            priorThreads: member.memory?.topicsToRevisit ?? [],
          })
        : [];
      let smsResults: Awaited<ReturnType<typeof sendCallReportSmsToAlertContacts>> | null = null;
      let smsError: string | null = null;
      let careAlertResults: Awaited<ReturnType<typeof sendCareAlertSmsToAlertContacts>> | null = null;
      let careAlertError: string | null = null;
      const shouldSendCareAlert = Boolean(
        member &&
        completedAt &&
        careAssessment &&
        (careAssessment.severity === "urgent" || concernEscalates) &&
        !call.alertSentAt &&
        !isDemoCall,
      );

      if (shouldSendCareAlert && member && careAssessment) {
        try {
          careAlertResults = await sendCareAlertSmsToAlertContacts({
            alertContacts: member.customer.alertContacts,
            memberName: member.name,
            severity: careAssessment.severity === "urgent" ? "urgent" : "concern",
            category: careAssessment.category,
            evidence: careAssessment.evidence,
            selfHarm: careAssessment.selfHarm,
            isDemo: isDemoCall,
          });
        } catch (error) {
          careAlertError = error instanceof Error ? error.message : "Unknown care alert SMS error";
        }
      }

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
        const threadTexts = openThreads.map((thread) => thread.text);
        const interestTags = deriveInterestTags([
          ...(existingMemory?.interestTags ?? []),
          ...insights.memoryUpdates.possibleHobbies,
          ...insights.memoryUpdates.recentTopics,
        ]);

        await prisma.seniorMemory.upsert({
          where: { memberId: member.id },
          create: {
            memberId: member.id,
            preferredName: member.name,
            hobbies: insights.memoryUpdates.possibleHobbies,
            interestTags,
            routines: insights.memoryUpdates.possibleRoutines,
            healthNotes: insights.memoryUpdates.possibleHealthNotes,
            recentMood: insights.mood,
            topicsToRevisit: mergeList([], threadTexts.length ? threadTexts : insights.memoryUpdates.topicsToRevisit, 6),
            recentTopics: insights.memoryUpdates.recentTopics,
            lastSummary: insights.memoryUpdates.lastSummary,
          },
          update: {
            recentMood: insights.mood,
            recentTopics: { set: mergeList(insights.memoryUpdates.recentTopics, existingMemory?.recentTopics ?? [], 8) },
            topicsToRevisit: { set: mergeList(existingMemory?.topicsToRevisit, threadTexts.length ? threadTexts : insights.memoryUpdates.topicsToRevisit, 6) },
            lastSummary: insights.memoryUpdates.lastSummary,
            interestTags: { set: interestTags },
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
          followUpSuggested: Boolean(insights.followUpSuggested || (careAssessment && careAssessment.severity !== "none")),
          followUpReason: careAssessment && careAssessment.severity !== "none"
            ? getCareFollowUpReason(careAssessment, concernEscalates)
            : insights.followUpReason,
          memoryUpdates: insights.memoryUpdates as Prisma.InputJsonValue,
          conversationRaw: {
            ...getRawObject(call.conversationRaw),
            providerDetails: details,
            careAssessment,
            careAlertSent: Boolean(careAlertResults?.length),
            careAlertResults,
            careAlertError,
          } as Prisma.InputJsonValue,
          syncedAt: new Date(),
          reportSentAt: smsResults?.length ? new Date() : call.reportSentAt,
          alertSentAt: careAlertResults?.length ? new Date() : call.alertSentAt,
        },
      });

      results.push({
        id: updated.id,
        ok: true,
        status: updated.status,
        timedOut: isStuckInProgress,
        hasTranscript: Boolean(updated.transcript),
        smsSent: Boolean(smsResults?.length),
        careAlertSent: Boolean(careAlertResults?.length),
        smsResults,
        smsError,
        careAlertResults,
        careAlertError,
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
