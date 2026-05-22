import { NextResponse } from "next/server";

import { isAdminAuthenticated } from "@/lib/admin-auth";
import { cartesiaTestCallSchema, createCartesiaTestCallToken, getPublicBaseUrl } from "@/lib/cartesia-test-call";
import { getServerEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

type TwilioCallResponse = {
  sid?: string;
  status?: string;
  message?: string;
};

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ ok: false, error: "Not authenticated." }, { status: 401 });
  }

  const parsed = cartesiaTestCallSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid Cartesia test call request." }, { status: 400 });
  }

  const env = getServerEnv();

  if (!env.CARTESIA_API_KEY) {
    return NextResponse.json({ ok: false, error: "CARTESIA_API_KEY is not configured." }, { status: 503 });
  }

  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN || !env.TWILIO_FROM_NUMBER) {
    return NextResponse.json({ ok: false, error: "Twilio call credentials are not configured." }, { status: 503 });
  }

  const token = createCartesiaTestCallToken(parsed.data);
  const baseUrl = getPublicBaseUrl();
  const voiceUrl = new URL(`${baseUrl}/api/cartesia-test/twiml`);
  voiceUrl.searchParams.set("token", token);

  const body = new URLSearchParams({
    To: parsed.data.toNumber.replace(/\s+/g, ""),
    From: env.TWILIO_FROM_NUMBER,
    Url: voiceUrl.toString(),
    Method: "POST",
  });

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
    return NextResponse.json(
      { ok: false, error: payload?.message ?? `Twilio call failed with status ${response.status}.` },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    result: {
      sid: payload?.sid ?? null,
      status: payload?.status ?? null,
    },
  });
}
