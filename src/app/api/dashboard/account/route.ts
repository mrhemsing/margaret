import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { memberPhotosBucket } from "@/lib/member-photos";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getStripeClient } from "@/lib/stripe";

const deleteAccountSchema = z.object({
  confirmation: z.literal("DELETE"),
});

function getBearerToken(request: Request) {
  const authHeader = request.headers.get("authorization");
  return authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;
}

async function cancelStripeSubscriptions(subscriptions: Array<{ stripeSubscriptionId: string | null }>) {
  const stripeSubscriptionIds = subscriptions
    .map((subscription) => subscription.stripeSubscriptionId)
    .filter((subscriptionId): subscriptionId is string => Boolean(subscriptionId));

  if (stripeSubscriptionIds.length === 0) return;

  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("Billing cancellation is not configured.");
  }

  const stripe = getStripeClient();

  for (const subscriptionId of stripeSubscriptionIds) {
    try {
      await stripe.subscriptions.cancel(subscriptionId);
    } catch (error) {
      const stripeError = error as { code?: string; statusCode?: number };
      if (stripeError.code === "resource_missing" || stripeError.statusCode === 404) continue;
      throw error;
    }
  }
}

export async function DELETE(request: Request) {
  const token = getBearerToken(request);

  if (!token) {
    return NextResponse.json({ ok: false, error: "Not logged in." }, { status: 401 });
  }

  const parsed = deleteAccountSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Type DELETE to confirm account deletion." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: authData, error: authError } = await supabase.auth.getUser(token);

  if (authError || !authData.user) {
    return NextResponse.json({ ok: false, error: "Session expired." }, { status: 401 });
  }

  const customer = await prisma.customer.findFirst({
    where: {
      OR: [
        { supabaseUserId: authData.user.id },
        ...(authData.user.email ? [{ email: authData.user.email.toLowerCase() }] : []),
      ],
    },
    include: {
      members: {
        select: {
          photoStoragePath: true,
        },
      },
      subscriptions: {
        select: {
          stripeSubscriptionId: true,
        },
      },
    },
  });

  if (!customer) {
    await supabase.auth.admin.deleteUser(authData.user.id).catch(() => null);
    return NextResponse.json({ ok: true });
  }

  try {
    await cancelStripeSubscriptions(customer.subscriptions);
  } catch (error) {
    console.error("Account deletion failed while canceling billing", { customerId: customer.id, error });
    return NextResponse.json({ ok: false, error: "Could not cancel billing. Please contact support before deleting this account." }, { status: 502 });
  }

  const photoStoragePaths = customer.members
    .map((member) => member.photoStoragePath)
    .filter((photoStoragePath): photoStoragePath is string => Boolean(photoStoragePath));

  if (photoStoragePaths.length > 0) {
    await supabase.storage.from(memberPhotosBucket).remove(photoStoragePaths).catch((error) => {
      console.error("Account deletion could not remove every member photo", { customerId: customer.id, error });
    });
  }

  await prisma.customer.delete({
    where: { id: customer.id },
  });

  const { error: deleteUserError } = await supabase.auth.admin.deleteUser(authData.user.id);

  if (deleteUserError) {
    console.error("Account deletion removed customer data but could not delete auth user", { customerId: customer.id, userId: authData.user.id, error: deleteUserError });
    return NextResponse.json({ ok: false, error: "Account data was deleted, but login cleanup needs support follow-up." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
