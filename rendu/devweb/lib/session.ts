import "server-only";

import { cookies } from "next/headers";

import { encrypt, decrypt, type SessionPayload } from "./jwt";
import type { AccountType } from "./types";

export type { SessionPayload } from "./jwt";

const COOKIE_NAME = "session";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 jours

export async function createSession(userId: string, accountType: AccountType): Promise<void> {
  const expiresAt = new Date(Date.now() + MAX_AGE_MS);
  const token = await encrypt({ userId, accountType });
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // localhost = http en dev
    expires: expiresAt,
    sameSite: "lax",
    path: "/",
  });
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  return decrypt(cookieStore.get(COOKIE_NAME)?.value);
}
