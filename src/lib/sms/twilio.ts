import { getServerEnv } from "@/lib/env";
import type { AlertContact } from "@prisma/client";

type SendSmsInput = {
  to: string;
  body: string;
};

type TwilioMessageResponse = {
  sid?: string;
  status?: string;
  message?: string;
};

type SmsRecipient = Pick<AlertContact, "name" | "phoneNumber" | "receivesAlerts" | "receivesReports">;

const exampleReportRecipients = [
  { name: "Matt", phoneNumber: "+16043138398" },
  { name: "Chuck", phoneNumber: "+13068802055" },
];

export async function sendSms(input: SendSmsInput) {
  const env = getServerEnv();

  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN || (!env.TWILIO_FROM_NUMBER && !env.TWILIO_MESSAGING_SERVICE_SID)) {
    throw new Error("Twilio SMS credentials are not configured.");
  }

  const body = new URLSearchParams({
    To: input.to,
    Body: input.body,
  });
  body.set(env.TWILIO_MESSAGING_SERVICE_SID ? "MessagingServiceSid" : "From", env.TWILIO_MESSAGING_SERVICE_SID ?? env.TWILIO_FROM_NUMBER ?? "");

  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
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
  isDemo?: boolean;
}) {
  const env = getServerEnv();
  const publicAppUrl = env.PUBLIC_APP_URL ?? env.APP_URL ?? "http://dailycall.care";
  const dashboardUrl = input.isDemo ? `${publicAppUrl}/dashboard/demos` : `${publicAppUrl}/dashboard`;
  const summary = input.summary?.trim() || "The call has been processed. Open the dashboard for details.";

  if (input.isDemo) {
    return `DailyCall DEMO report for ${input.memberName}: ${input.status.replaceAll("_", " ").toLowerCase()}. This was a 1-minute landing-page demo call, not a scheduled member check-in. ${summary}\n\nDemo logs: ${dashboardUrl}`;
  }

  return `DailyCall report for ${input.memberName}: ${input.status.replaceAll("_", " ").toLowerCase()}. ${summary}\n\nDashboard: ${dashboardUrl}`;
}

async function sendSmsToRecipients(recipients: Array<Pick<SmsRecipient, "name" | "phoneNumber">>, body: string) {
  const results = [];

  for (const recipient of recipients) {
    const result = await sendSms({ to: recipient.phoneNumber, body });
    results.push({ recipient: recipient.name, phoneNumber: recipient.phoneNumber, sid: result.sid, status: result.status });
  }

  return results;
}

async function sendSmsToExampleTeam(body: string) {
  return sendSmsToRecipients(exampleReportRecipients, body);
}

export async function sendExampleReportSmsToTeam(input: {
  memberName: string;
  status: string;
  summary?: string | null;
  isDemo?: boolean;
}) {
  return sendSmsToExampleTeam(buildCallReportSms(input));
}

export async function sendCallReportSmsToAlertContacts(input: {
  alertContacts: SmsRecipient[];
  memberName: string;
  status: string;
  summary?: string | null;
  isDemo?: boolean;
}) {
  const recipients = input.alertContacts.filter((contact) => contact.receivesReports);
  if (recipients.length === 0) return [];

  return sendSmsToRecipients(recipients, buildCallReportSms(input));
}

export function buildVoicemailAlertSms(input: {
  memberName: string;
  summary?: string | null;
  isDemo?: boolean;
}) {
  const env = getServerEnv();
  const publicAppUrl = env.PUBLIC_APP_URL ?? env.APP_URL ?? "http://dailycall.care";
  const dashboardUrl = input.isDemo ? `${publicAppUrl}/dashboard/demos` : `${publicAppUrl}/dashboard`;
  const summary = input.summary?.trim() || "Voicemail or an answering machine was detected. DailyCall hung up without leaving a message.";

  if (input.isDemo) {
    return `DailyCall DEMO alert for ${input.memberName}: voicemail reached during a 1-minute landing-page demo call. ${summary}\n\nDemo logs: ${dashboardUrl}`;
  }

  return `DailyCall alert for ${input.memberName}: voicemail reached. ${summary}\n\nDashboard: ${dashboardUrl}`;
}

export async function sendVoicemailAlertSmsToAlertContacts(input: {
  alertContacts: SmsRecipient[];
  memberName: string;
  summary?: string | null;
  isDemo?: boolean;
}) {
  const recipients = input.alertContacts.filter((contact) => contact.receivesAlerts);
  if (recipients.length === 0) return [];

  return sendSmsToRecipients(recipients, buildVoicemailAlertSms(input));
}

export async function sendExampleVoicemailAlertSmsToTeam(input: {
  memberName: string;
  summary?: string | null;
  isDemo?: boolean;
}) {
  return sendSmsToExampleTeam(buildVoicemailAlertSms(input));
}
