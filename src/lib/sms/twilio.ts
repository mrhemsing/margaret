import { getServerEnv } from "@/lib/env";

type SendSmsInput = {
  to: string;
  body: string;
};

type TwilioMessageResponse = {
  sid?: string;
  status?: string;
  message?: string;
};

const exampleReportRecipients = [
  { name: "Matt", phoneNumber: "+16043138398" },
  { name: "Chuck", phoneNumber: "+13068802055" },
];

export async function sendSms(input: SendSmsInput) {
  const env = getServerEnv();

  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN || !env.TWILIO_FROM_NUMBER) {
    throw new Error("Twilio SMS credentials are not configured.");
  }

  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      From: env.TWILIO_FROM_NUMBER,
      To: input.to,
      Body: input.body,
    }),
  });

  const payload = (await response.json().catch(() => null)) as TwilioMessageResponse | null;

  if (!response.ok) {
    throw new Error(payload?.message ?? `Twilio SMS failed with status ${response.status}`);
  }

  if (!payload) {
    throw new Error("Twilio SMS returned an empty response.");
  }

  return payload;
}

export function buildCallReportSms(input: {
  memberName: string;
  status: string;
  summary?: string | null;
}) {
  const env = getServerEnv();
  const publicAppUrl = env.PUBLIC_APP_URL ?? env.APP_URL ?? "https://soma3.b-average.com";
  const dashboardUrl = `${publicAppUrl}/dashboard`;
  const summary = input.summary?.trim() || "The call has been processed. Open the dashboard for details.";

  return `Dailycall report for ${input.memberName}: ${input.status.replaceAll("_", " ").toLowerCase()}. ${summary}\n\nDashboard: ${dashboardUrl}`;
}

async function sendSmsToExampleTeam(body: string) {
  const results = [];

  for (const recipient of exampleReportRecipients) {
    const result = await sendSms({ to: recipient.phoneNumber, body });
    results.push({ recipient: recipient.name, phoneNumber: recipient.phoneNumber, sid: result.sid, status: result.status });
  }

  return results;
}

export async function sendExampleReportSmsToTeam(input: {
  memberName: string;
  status: string;
  summary?: string | null;
}) {
  return sendSmsToExampleTeam(buildCallReportSms(input));
}

export function buildVoicemailAlertSms(input: {
  memberName: string;
  summary?: string | null;
}) {
  const env = getServerEnv();
  const publicAppUrl = env.PUBLIC_APP_URL ?? env.APP_URL ?? "https://soma3.b-average.com";
  const dashboardUrl = `${publicAppUrl}/dashboard`;
  const summary = input.summary?.trim() || "Voicemail or an answering machine was detected. Dailycall hung up without leaving a message.";

  return `Dailycall alert for ${input.memberName}: voicemail reached. ${summary}\n\nDashboard: ${dashboardUrl}`;
}

export async function sendExampleVoicemailAlertSmsToTeam(input: {
  memberName: string;
  summary?: string | null;
}) {
  return sendSmsToExampleTeam(buildVoicemailAlertSms(input));
}
