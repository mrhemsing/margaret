import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { startAmdProtectedCheckInCall } from "@/lib/voice/twilio";

const exampleContacts = {
  matt: {
    memberName: "Matt",
    toNumber: "+16043138398",
    caregiverName: "DailyCall team",
  },
  chuck: {
    memberName: "Chuck",
    toNumber: "+13068802055",
    caregiverName: "DailyCall team",
  },
} as const;

const requestSchema = z.object({
  contact: z.enum(["matt", "chuck"]),
});

async function getMattFamilyMember() {
  const target = exampleContacts.matt;
  const customer = await prisma.customer.findUnique({
    where: { email: "mhemsing@hprodev.com" },
  });

  if (!customer) return null;

  const existingMember = await prisma.member.findFirst({
    where: {
      customerId: customer.id,
      phoneNumber: target.toNumber,
    },
    orderBy: { createdAt: "desc" },
  });

  if (existingMember) return existingMember;

  return prisma.member.create({
    data: {
      customerId: customer.id,
      name: target.memberName,
      phoneNumber: target.toNumber,
      timezone: "America/Los_Angeles",
      preferredCallTime: "On demand test",
    },
  });
}

async function ensureExampleMember(contact: keyof typeof exampleContacts) {
  const target = exampleContacts[contact];

  if (contact === "matt") {
    const mattFamilyMember = await getMattFamilyMember();
    if (mattFamilyMember) return mattFamilyMember;
  }

  const customer = await prisma.customer.upsert({
    where: { email: "example-family@dailycall.local" },
    update: {},
    create: {
      email: "example-family@dailycall.local",
      fullName: "Example Family",
      phoneNumber: "+16043138398",
    },
  });

  const existingMember = await prisma.member.findFirst({
    where: {
      customerId: customer.id,
      phoneNumber: target.toNumber,
    },
  });

  if (existingMember) return existingMember;

  return prisma.member.create({
    data: {
      customerId: customer.id,
      name: target.memberName,
      phoneNumber: target.toNumber,
      timezone: "America/Los_Angeles",
      preferredCallTime: "On demand test",
    },
  });
}

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Expected contact to be matt or chuck." }, { status: 400 });
  }

  const target = exampleContacts[parsed.data.contact];

  try {
    const member = await ensureExampleMember(parsed.data.contact);
    const recentInProgressCall = await prisma.callAttempt.findFirst({
      where: {
        memberId: member.id,
        status: "IN_PROGRESS",
        createdAt: { gte: new Date(Date.now() - 15 * 60 * 1000) },
      },
      orderBy: { createdAt: "desc" },
    });

    if (recentInProgressCall) {
      return NextResponse.json({
        ok: true,
        reused: true,
        provider: "twilio_amd_bridge",
        member,
        callAttempt: recentInProgressCall,
        result: {
          conversation_id: recentInProgressCall.providerConversationId,
          sid: recentInProgressCall.providerCallSid,
        },
      });
    }

    const result = await startAmdProtectedCheckInCall({
      ...target,
      memberName: member.name,
    });

    if (!result) {
      throw new Error("ElevenLabs did not return a call result.");
    }

    const callAttempt = await prisma.callAttempt.create({
      data: {
        memberId: member.id,
        scheduledFor: new Date(),
        startedAt: new Date(),
        status: "IN_PROGRESS",
        providerCallSid: result.sid ?? null,
        summary: `Test call started for ${member.name}. Transcript will appear after ElevenLabs finishes processing the conversation.`,
      },
    });

    return NextResponse.json({
      ok: true,
      provider: "twilio_amd_bridge",
      member,
      callAttempt,
      result,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown example call error" },
      { status: 502 },
    );
  }
}
