type StartAmdProtectedCallInput = {
  toNumber: string;
  callAttemptId?: string;
  memberName?: string;
  caregiverName?: string;
  voiceProvider?: "openai_realtime_twilio" | "openai_text_elevenlabs_twilio" | "elevenlabs_twilio";
  machineDetection?: boolean;
  refreshCurrentContext?: boolean;
};

type TwilioCallResponse = {
  sid?: string;
  status?: string;
  to?: string;
  from?: string;
  message?: string;
};

function getPublicBaseUrl() {
  const baseUrl = (process.env.PUBLIC_APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://dailycall.care").replace(/\/$/, "");
  return baseUrl === "https://dailycall.care" ? "https://www.dailycall.care" : baseUrl;
}

async function refreshCurrentContextBeforeCall() {
  try {
    const [{ prisma }, { refreshCallCurrentInfoSnapshots }] = await Promise.all([
      import("@/lib/db"),
      import("@/lib/voice/current-info"),
    ]);
    await Promise.race([
      refreshCallCurrentInfoSnapshots(prisma),
      new Promise((resolve) => setTimeout(resolve, 2500)),
    ]);
  } catch (error) {
    console.error("Pre-call current context refresh failed", error);
  }
}

export async function startAmdProtectedCheckInCall(input: StartAmdProtectedCallInput) {
  const { getDailyCallOutboundFromNumber, getServerEnv } = await import("@/lib/env");
  const env = getServerEnv();

  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) {
    throw new Error("Twilio credentials are not configured.");
  }

  if (input.refreshCurrentContext !== false) {
    await refreshCurrentContextBeforeCall();
  }

  const baseUrl = getPublicBaseUrl();
  const voiceUrl = new URL(`${baseUrl}/api/twilio/voice/amd`);
  if (input.callAttemptId) {
    voiceUrl.searchParams.set("callAttemptId", input.callAttemptId);
  }
  voiceUrl.searchParams.set("memberName", input.memberName ?? "there");
  voiceUrl.searchParams.set("caregiverName", input.caregiverName ?? "your caregiver");
  if (input.voiceProvider) {
    voiceUrl.searchParams.set("voiceProvider", input.voiceProvider);
  }

  const body = new URLSearchParams({
    To: input.toNumber,
    From: getDailyCallOutboundFromNumber(),
    Url: voiceUrl.toString(),
    Method: "POST",
    StatusCallback: `${baseUrl}/api/twilio/status`,
    StatusCallbackMethod: "POST",
  });

  if (input.machineDetection !== false) {
    body.set("MachineDetection", "Enable");
    body.set("MachineDetectionTimeout", "5");
  }

  for (const event of ["initiated", "ringing", "answered", "completed"]) {
    body.append("StatusCallbackEvent", event);
  }

  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Calls.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const payload = (await response.json().catch(() => null)) as TwilioCallResponse | null;

  if (!response.ok) {
    throw new Error(payload?.message ?? `Twilio AMD call failed with status ${response.status}`);
  }

  if (!payload?.sid) {
    throw new Error("Twilio did not return a call SID.");
  }

  return payload;
}
