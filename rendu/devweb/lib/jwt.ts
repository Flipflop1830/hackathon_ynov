import { SignJWT, jwtVerify } from "jose";

import type { AccountType } from "./types";

// Crypto JWT pure (jose). PAS d'import next/headers ici → utilisable aussi dans
// le proxy (ex-middleware), qui ne peut pas importer next/headers.

const SECRET = process.env.AUTH_SECRET;
if (!SECRET) {
  throw new Error("AUTH_SECRET manquant dans l'environnement (.env.local).");
}
const encodedKey = new TextEncoder().encode(SECRET);

export type SessionPayload = {
  userId: string;
  accountType: AccountType;
};

export async function encrypt(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(encodedKey);
}

export async function decrypt(token?: string): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, encodedKey, { algorithms: ["HS256"] });
    if (typeof payload.userId === "string" && typeof payload.accountType === "string") {
      return { userId: payload.userId, accountType: payload.accountType as AccountType };
    }
    return null;
  } catch {
    return null;
  }
}
