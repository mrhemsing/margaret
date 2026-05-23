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
  error?: string;
  detail?: string;
  calls?: Array<{ id?: string; call_id?: string; status?: string }>;
};

type CartesiaAgentResponse = {
  id?: string;
  phone_numbers?: Array<{ id?: string; phone_number_id?: string }>;
  message?: string;
  error?: string;
};

function getCartesiaError(result: CartesiaOutboundResponse | null, status: number) {
  return result?.message ?? result?.error ?? result?.detail ?? `Cartesia outbound call failed with status ${status}.`;
}

async function getCartesiaFromNumberId(input: { apiKey: string; agentId: string; configuredFromNumberId?: string }) {
  if (input.configuredFromNumberId) return input.configuredFromNumberId;

  const response = await fetch(`https://api.cartesia.ai/agents/${encodeURIComponent(input.agentId)}`, {
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      "X-API-Key": input.apiKey,
      "Cartesia-Version": "2026-03-01",
    },
  });
  const agent = (await response.json().catch(() => null)) as CartesiaAgentResponse | null;

  if (!response.ok) {
    throw new Error(agent?.message ?? agent?.error ?? `Cartesia agent lookup failed with status ${response.status}.`);
  }

  const fromNumberId = agent?.phone_numbers?.[0]?.id ?? agent?.phone_numbers?.[0]?.phone_number_id;

  if (!fromNumberId) {
    throw new Error(
      "Cartesia agent has no phone number assigned. In Cartesia, assign/import a phone number for this agent, then set CARTESIA_FROM_NUMBER_ID if it is not shown on the agent.",
    );
  }

  return fromNumberId;
}

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

  let fromNumberId: string;
  try {
    fromNumberId = await getCartesiaFromNumberId({
      apiKey: env.CARTESIA_API_KEY,
      agentId: env.CARTESIA_AGENT_ID,
      configuredFromNumberId: env.CARTESIA_FROM_NUMBER_ID,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cartesia phone number lookup failed.";
    await prisma.callAttempt.update({
      where: { id: callAttempt.id },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        summary: message,
        syncedAt: new Date(),
      },
    });

    return NextResponse.json({ ok: false, error: message }, { status: 503 });
  }

  const response = await fetch("https://api.cartesia.ai/agents/calls", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.CARTESIA_API_KEY}`,
      "X-API-Key": env.CARTESIA_API_KEY,
      "Cartesia-Version": "2026-03-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      agent_id: env.CARTESIA_AGENT_ID,
      from_number_id: fromNumberId,
      to_number: normalizedPhone,
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
    const error = getCartesiaError(result, response.status);
    await prisma.callAttempt.update({
      where: { id: callAttempt.id },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        summary: error,
        syncedAt: new Date(),
      },
    });

    return NextResponse.json({ ok: false, error }, { status: 502 });
  }

  const providerCallId = result?.call_id ?? result?.id ?? result?.calls?.[0]?.call_id ?? result?.calls?.[0]?.id ?? null;

  await prisma.callAttempt.update({
    where: { id: callAttempt.id },
    data: {
      providerCallSid: providerCallId,
      syncedAt: new Date(),
    },
  });

  return NextResponse.json({
    ok: true,
    result: {
      sid: providerCallId,
      status: result?.status ?? result?.calls?.[0]?.status ?? null,
    },
  });
}
