import { createHash } from "crypto";
import { cookies } from "next/headers";

export const ADMIN_AUTH_COOKIE = "dailycall_admin_auth";

export function hashAdminPassword(password: string) {
  return createHash("sha256").update(password).digest("hex");
}

export async function isAdminAuthenticated() {
  const password = process.env.ADMIN_DASHBOARD_PASSWORD;

  if (!password) return false;

  const cookieStore = await cookies();
  return cookieStore.get(ADMIN_AUTH_COOKIE)?.value === hashAdminPassword(password);
}
