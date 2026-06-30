import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { getSession, type SessionPayload } from "./session";
import { prisma } from "./prisma";

/**
 * Data Access Layer — centralise la vérification de session (pattern recommandé
 * par la doc Next.js). Mémoïsé par requête via React `cache`.
 */
export const verifySession = cache(async (): Promise<SessionPayload> => {
  const session = await getSession();
  if (!session?.userId) {
    redirect("/login");
  }
  return session;
});

/** Retourne l'utilisateur courant (colonnes sûres uniquement) ou null. */
export const getCurrentUser = cache(async () => {
  const session = await getSession();
  if (!session?.userId) return null;
  return prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, name: true, accountType: true },
  });
});
