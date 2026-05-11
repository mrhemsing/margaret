type StartAmdProtectedCallInput = {
  toNumber: string;
  memberName?: string;
  caregiverName?: string;
};

type TwilioCallResponse = {
  sid?: string;
  status?: string;
  to?: string;
  from?: string;
  message?: string;
};

function getPublicBaseUrl() {
  return (process.env.PUBLIC_APP_URL || process.env.NEXT_PUBLIC_APP_URL || "https://soma3.b-average.com").replace(/\/$/, "");
}

export async function startAmdProtectedCheckInCall(input: StartAmdProtectedCallInput) {
  const { getServerEnv } = await import("@/lib/env");
  const env = getServerEnv();

  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN || !env.TWILIO_FROM_NUMBER) {
    throw new Error("Twilio credentials are not configured.");
  }

  const baseUrl = getPublicBaseUrl();
  const voiceUrl = new URL(`${baseUrl}/api/twilio/voice/amd`);
  voiceUrl.searchParams.set("memberName", input.memberName ?? "there");
  voiceUrl.searchParams.set("caregiverName", input.caregiverName ?? "your caregiver");

  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Calls.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      To: input.toNumber,
      From: env.TWILIO_FROM_NUMBER,
      Url: voiceUrl.toString(),
      Method: "POST",
      MachineDetection: "Enable",
      MachineDetectionTimeout: "5",
      StatusCallback: `${baseUrl}/api/twilio/status`,
      StatusCallbackMethod: "POST",
      StatusCallbackEvent: "initiated ringing answered completed",
    }),
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

export function getElevenLabsBridgeNumber() {
  return process.env.ELEVENLABS_TWILIO_BRIDGE_NUMBER || null;
}
