import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";

import { getSupabase } from "./supabase";

export const ADMIN_COOKIE_NAME = "kbc_admin";
const SESSION_TTL_SECS = 60 * 60 * 24 * 7;

type SessionRow = {
  expires_at: string;
  revoked_at: string | null;
};

export async function isAdmin(): Promise<boolean> {
  const token = (await cookies()).get(ADMIN_COOKIE_NAME)?.value;
  if (!token) return false;

  const { data } = await getSupabase()
    .from("admin_sessions")
    .select("expires_at, revoked_at")
    .eq("token", token)
    .maybeSingle<SessionRow>();

  if (!data) return false;
  if (data.revoked_at) return false;
  if (new Date(data.expires_at).getTime() < Date.now()) return false;
  return true;
}

export async function createAdminSession(): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECS * 1000);

  const { error } = await getSupabase().from("admin_sessions").insert({
    token,
    expires_at: expiresAt.toISOString(),
  });
  if (error) {
    throw new Error(`Failed to create admin session: ${error.message}`);
  }

  (await cookies()).set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/schedule",
    maxAge: SESSION_TTL_SECS,
  });
}

export async function destroyAdminSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE_NAME)?.value;
  if (token) {
    await getSupabase()
      .from("admin_sessions")
      .update({ revoked_at: new Date().toISOString() })
      .eq("token", token);
  }
  store.delete(ADMIN_COOKIE_NAME);
}
