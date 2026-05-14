type StartOutboundCheckInCallInput = {
  toNumber: string;
  memberName?: string;
  caregiverName?: string;
  companionContext?: string;
  recentTopics?: string[];
  topicsToRevisit?: string[];
  avoidRepeating?: string[];
  demoMaxDurationSeconds?: number;
};

type ElevenLabsOutboundCallResponse = {
  success: boolean;
  message?: string;
  conversation_id?: string | null;
  callSid?: string | null;
};

type ElevenLabsTranscriptTurn = {
  role?: string;
  message?: string | null;
  text?: string | null;
};

type ElevenLabsConversationDetails = {
  conversation_id: string;
  status?: string;
  transcript?: ElevenLabsTranscriptTurn[];
  analysis?: {
    transcript_summary?: string | null;
    call_summary_title?: string | null;
    [key: string]: unknown;
  } | null;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
};

export function formatConversationTranscript(transcript: ElevenLabsTranscriptTurn[] | undefined, memberName = "Member") {
  if (!transcript?.length) return null;

  return transcript
    .map((turn) => {
      const speaker = turn.role === "agent" ? "DailyCall" : turn.role === "user" ? memberName : turn.role ?? "Speaker";
      const text = turn.message ?? turn.text ?? "";
      return text.trim() ? `${speaker}: ${text.trim()}` : null;
    })
    .filter(Boolean)
    .join("\n\n");
}

export function relabelConversationTranscript(transcript: string | null | undefined, memberName: string) {
  if (!transcript) return transcript ?? null;

  return transcript.replace(/^Parent:/gm, `${memberName}:`);
}

export function mapConversationStatus(status: string | undefined) {
  if (status === "done") return "ANSWERED_OK";
  if (status === "failed") return "FAILED";
  if (status === "in-progress" || status === "processing" || status === "initiated") return "IN_PROGRESS";
  return "IN_PROGRESS";
}

export async function getConversationDetails(conversationId: string) {
  const { getServerEnv } = await import("@/lib/env");
  const env = getServerEnv();

  const response = await fetch(`https://api.elevenlabs.io/v1/convai/conversations/${conversationId}`, {
    headers: {
      "xi-api-key": env.ELEVENLABS_API_KEY,
    },
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as ElevenLabsConversationDetails | { message?: string } | null;

  if (!response.ok) {
    throw new Error((payload as { message?: string } | null)?.message ?? `ElevenLabs conversation fetch failed with status ${response.status}`);
  }

  return payload as ElevenLabsConversationDetails;
}

export async function startOutboundCheckInCall(input: StartOutboundCheckInCallInput) {
  const { getServerEnv } = await import("@/lib/env");
  const env = getServerEnv();

  const response = await fetch("https://api.elevenlabs.io/v1/convai/twilio/outbound-call", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": env.ELEVENLABS_API_KEY,
    },
    body: JSON.stringify({
      agent_id: env.ELEVENLABS_AGENT_ID,
      agent_phone_number_id: env.ELEVENLABS_AGENT_PHONE_NUMBER_ID,
      to_number: input.toNumber,
      conversation_initiation_client_data: {
        dynamic_variables: {
          member_name: input.memberName ?? "there",
          caregiver_name: input.caregiverName ?? "your caregiver",
          companion_context: input.companionContext ?? "No prior memory yet. Be warm, gentle, curious, and non-clinical.",
          recent_topics: input.recentTopics?.join(", ") || "none yet",
          topics_to_revisit: input.topicsToRevisit?.join("; ") || "none yet",
          avoid_repeating: input.avoidRepeating?.join("; ") || "Do not use a generic scripted wellness survey opening.",
          demo_max_duration_seconds: input.demoMaxDurationSeconds ?? null,
        },
      },
    }),
  });

  const payload = (await response.json().catch(() => null)) as ElevenLabsOutboundCallResponse | null;

  if (!response.ok) {
    throw new Error(payload?.message ?? `ElevenLabs outbound call failed with status ${response.status}`);
  }

  return payload;
}

export async function endTwilioCall(callSid: string) {
  const { getServerEnv } = await import("@/lib/env");
  const env = getServerEnv();

  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) {
    throw new Error("Twilio credentials are not configured.");
  }

  const auth = Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString("base64");
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Calls/${callSid}.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ Status: "completed" }),
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || `Twilio call end failed with status ${response.status}`);
  }
}

export function scheduleTwilioCallEnd(callSid: string, delayMs: number) {
  const timer = setTimeout(() => {
    endTwilioCall(callSid).catch((error) => {
      console.error("Failed to end capped demo call", error);
    });
  }, delayMs);

  timer.unref?.();
}
