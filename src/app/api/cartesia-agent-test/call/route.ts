import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

import { isAdminAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { getServerEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  toNumber: z.string().min(8),
  memberName: z.string().min(1).optional(),
  caregiverName: z.string().min(1).optional(),
  firstMessage: z.string().trim().min(1).max(500).optional(),
});

type CartesiaOutboundResponse = {
  id?: string;
  call_id?: string;
  status?: string;
  message?: string;
};

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ ok: false, error: "Not authenticated." }, { status: 401 });
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid request. Expected toNumber, optional memberName, optional caregiverName." },
      { status: 400 },
    );
  }

  const env = getServerEnv();

  if (!env.CARTESIA_API_KEY) {
    return NextResponse.json({ ok: false, error: "CARTESIA_API_KEY is not configured." }, { status: 503 });
  }

  if (!env.CARTESIA_AGENT_ID) {
    return NextResponse.json({ ok: false, error: "CARTESIA_AGENT_ID is not configured." }, { status: 503 });
  }

  const normalizedPhone = parsed.data.toNumber.replace(/\s+/g, "");

  const customer = await prisma.customer.upsert({
    where: { email: "cartesia-agent-test@dailycall.local" },
    update: { fullName: "Cartesia Agent Test", phoneNumber: "+16043138398" },
    create: {
      email: "cartesia-agent-test@dailycall.local",
      fullName: "Cartesia Agent Test",
      phoneNumber: "+16043138398",
    },
  });

  const existingMember = await prisma.member.findFirst({
    where: { customerId: customer.id, phoneNumber: normalizedPhone },
  });
  const member = existingMember
    ? await prisma.member.update({
        where: { id: existingMember.id },
        data: { name: parsed.data.memberName ?? existingMember.name },
      })
    : await prisma.member.create({
        data: {
          customerId: customer.id,
          name: parsed.data.memberName ?? "Cartesia agent phone test",
          phoneNumber: normalizedPhone,
          timezone: "America/Los_Angeles",
          preferredCallTime: "Cartesia native agent phone test",
        },
      });

  const callAttempt = await prisma.callAttempt.create({
    data: {
      memberId: member.id,
      scheduledFor: new Date(),
      startedAt: new Date(),
      status: "IN_PROGRESS",
      summary: `Cartesia native agent phone test started for ${member.name}.`,
      conversationRaw: {
        provider: "cartesia_line_agent",
        cartesiaAgentId: env.CARTESIA_AGENT_ID,
        initialPrompt: parsed.data.firstMessage,
        hybridTranscript: [],
      } as Prisma.InputJsonValue,
      syncedAt: new Date(),
    },
  });

  const response = await fetch("https://api.cartesia.ai/twilio/call/outbound", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.CARTESIA_API_KEY}`,
      "Cartesia-Version": "2025-04-16",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      target_numbers: [normalizedPhone],
      agent_id: env.CARTESIA_AGENT_ID,
      metadata: {
        callAttemptId: callAttempt.id,
        memberName: member.name,
        caregiverName: parsed.data.caregiverName ?? "DailyCall test reviewer",
        initialPrompt: parsed.data.firstMessage,
      },
    }),
  });

  const result = (await response.json().catch(() => null)) as CartesiaOutboundResponse | null;

  if (!response.ok) {
    await prisma.callAttempt.update({
      where: { id: callAttempt.id },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        summary: result?.message ?? `Cartesia outbound call failed with status ${response.status}.`,
        syncedAt: new Date(),
      },
    });

    return NextResponse.json(
      { ok: false, error: result?.message ?? `Cartesia outbound call failed with status ${response.status}.` },
      { status: 502 },
    );
  }

  await prisma.callAttempt.update({
    where: { id: callAttempt.id },
    data: {
      providerCallSid: result?.call_id ?? result?.id ?? null,
      syncedAt: new Date(),
    },
  });

  return NextResponse.json({
    ok: true,
    result: {
      sid: result?.call_id ?? result?.id ?? null,
      status: result?.status ?? null,
    },
  });
}
