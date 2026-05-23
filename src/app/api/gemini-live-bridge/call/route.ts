import { NextResponse } from "next/server";

import { isAdminAuthenticated } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function POST() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ ok: false, error: "Not authenticated." }, { status: 401 });
  }

  return NextResponse.json(
    {
      ok: false,
      error:
        "Gemini Live bridge is on the comparison roadmap but not callable yet. It needs GEMINI_API_KEY plus Twilio 8k mu-law to Gemini PCM audio conversion.",
    },
    { status: 503 },
  );
}
