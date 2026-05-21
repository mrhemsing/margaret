import type { Member } from "@prisma/client";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const memberPhotosBucket = process.env.SUPABASE_MEMBER_PHOTOS_BUCKET || "member-photos";

const signedUrlTtlSeconds = 60 * 60 * 24 * 7;

type MemberWithPhoto = Pick<Member, "id" | "photoUrl" | "photoStoragePath">;

export function getMemberPhotoStoragePath(customerId: string, memberId: string, extension = "jpg") {
  return `customers/${customerId}/members/${memberId}/photo.${extension}`;
}

export async function ensureMemberPhotosBucket() {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase.storage.getBucket(memberPhotosBucket);

  if (data) return;

  await supabase.storage.createBucket(memberPhotosBucket, {
    public: false,
    fileSizeLimit: "10MB",
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  });
}

export async function getMemberPhotoDisplayUrl(member: MemberWithPhoto) {
  if (!member.photoStoragePath) return member.photoUrl;

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.storage.from(memberPhotosBucket).createSignedUrl(member.photoStoragePath, signedUrlTtlSeconds);

  if (error || !data?.signedUrl) return member.photoUrl;

  return data.signedUrl;
}

export async function withMemberPhotoDisplayUrl<T extends MemberWithPhoto>(member: T): Promise<T> {
  return {
    ...member,
    photoUrl: await getMemberPhotoDisplayUrl(member),
  };
}

export async function withMembersPhotoDisplayUrls<T extends MemberWithPhoto>(members: T[]): Promise<T[]> {
  return Promise.all(members.map((member) => withMemberPhotoDisplayUrl(member)));
}
