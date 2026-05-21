import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { refreshCallCurrentInfoSnapshots } from "@/lib/voice/current-info";

export const dynamic = "force-dynamic";

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;

  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${secret}` || request.headers.get("x-cron-secret") === secret;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  return refreshCurrentInfo();
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  return refreshCurrentInfo();
}

async function refreshCurrentInfo() {
  try {
    const results = await refreshCallCurrentInfoSnapshots(prisma);

    return NextResponse.json({
      ok: true,
      refreshed: results.map((result) => ({
        key: result.key,
        ok: result.ok,
        fetchedAt: result.snapshot?.fetchedAt ?? null,
        expiresAt: result.snapshot?.expiresAt ?? null,
        summary: result.snapshot?.summary ?? null,
        error: result.error,
      })),
    });
  } catch (error) {
    console.error("Current info refresh failed", error);

    return NextResponse.json({
      ok: false,
      error: "Current info refresh failed.",
      detail: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
