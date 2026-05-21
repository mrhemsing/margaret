import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { ensureMemberPhotosBucket, getMemberPhotoStoragePath, memberPhotosBucket, withMemberPhotoDisplayUrl } from "@/lib/member-photos";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const maxPhotoBytes = 10 * 1024 * 1024;
const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

async function getAuthenticatedCustomerId(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;

  if (!token) return null;

  const supabase = createSupabaseAdminClient();
  const { data: authData, error: authError } = await supabase.auth.getUser(token);

  if (authError || !authData.user) return null;

  const customer = await prisma.customer.findFirst({
    where: {
      OR: [
        { supabaseUserId: authData.user.id },
        ...(authData.user.email ? [{ email: authData.user.email.toLowerCase() }] : []),
      ],
    },
    select: { id: true },
  });

  return customer?.id ?? null;
}

function extensionForContentType(contentType: string) {
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  return "jpg";
}

async function findOwnedMember(memberId: string, customerId: string) {
  return prisma.member.findFirst({
    where: { id: memberId, customerId },
    select: { id: true, customerId: true, photoStoragePath: true },
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ memberId: string }> }) {
  const customerId = await getAuthenticatedCustomerId(request);

  if (!customerId) {
    return NextResponse.json({ ok: false, error: "Not logged in." }, { status: 401 });
  }

  const { memberId } = await params;
  const member = await findOwnedMember(memberId, customerId);

  if (!member) {
    return NextResponse.json({ ok: false, error: "Loved one not found." }, { status: 404 });
  }

  const formData = await request.formData().catch(() => null);
  const photo = formData?.get("photo");

  if (!(photo instanceof File)) {
    return NextResponse.json({ ok: false, error: "Choose a photo to upload." }, { status: 400 });
  }

  if (!allowedImageTypes.has(photo.type)) {
    return NextResponse.json({ ok: false, error: "Please upload a JPG, PNG, or WebP image." }, { status: 400 });
  }

  if (photo.size > maxPhotoBytes) {
    return NextResponse.json({ ok: false, error: "Please choose an image smaller than 10 MB." }, { status: 400 });
  }

  const storagePath = getMemberPhotoStoragePath(customerId, memberId, extensionForContentType(photo.type));
  const supabase = createSupabaseAdminClient();
  await ensureMemberPhotosBucket();

  if (member.photoStoragePath && member.photoStoragePath !== storagePath) {
    await supabase.storage.from(memberPhotosBucket).remove([member.photoStoragePath]).catch(() => null);
  }

  const bytes = await photo.arrayBuffer();
  const { error: uploadError } = await supabase.storage.from(memberPhotosBucket).upload(storagePath, bytes, {
    contentType: photo.type,
    upsert: true,
  });

  if (uploadError) {
    return NextResponse.json({ ok: false, error: "Could not upload photo. Check Supabase Storage bucket setup." }, { status: 500 });
  }

  const updatedMember = await prisma.member.update({
    where: { id: memberId },
    data: {
      photoStoragePath: storagePath,
      photoUrl: null,
    },
    include: {
      memory: true,
      callAttempts: {
        orderBy: { scheduledFor: "desc" },
        take: 20,
      },
    },
  });

  return NextResponse.json({ ok: true, member: await withMemberPhotoDisplayUrl(updatedMember) });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ memberId: string }> }) {
  const customerId = await getAuthenticatedCustomerId(request);

  if (!customerId) {
    return NextResponse.json({ ok: false, error: "Not logged in." }, { status: 401 });
  }

  const { memberId } = await params;
  const member = await findOwnedMember(memberId, customerId);

  if (!member) {
    return NextResponse.json({ ok: false, error: "Loved one not found." }, { status: 404 });
  }

  const supabase = createSupabaseAdminClient();

  if (member.photoStoragePath) {
    await supabase.storage.from(memberPhotosBucket).remove([member.photoStoragePath]).catch(() => null);
  }

  const updatedMember = await prisma.member.update({
    where: { id: memberId },
    data: {
      photoStoragePath: null,
      photoUrl: null,
    },
    include: {
      memory: true,
      callAttempts: {
        orderBy: { scheduledFor: "desc" },
        take: 20,
      },
    },
  });

  return NextResponse.json({ ok: true, member: await withMemberPhotoDisplayUrl(updatedMember) });
}
