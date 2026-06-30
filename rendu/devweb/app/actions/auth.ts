"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import * as z from "zod";

import { prisma } from "@/lib/prisma";
import { createSession, deleteSession } from "@/lib/session";
import { LoginSchema, SignupSchema, type FormState } from "@/lib/definitions";
import type { AccountType } from "@/lib/types";

export async function signup(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = SignupSchema.safeParse({
    name: formData.get("name") ?? "",
    email: formData.get("email"),
    password: formData.get("password"),
    accountType: formData.get("accountType"),
  });

  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const { email, password, accountType, name } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { errors: { email: ["Cet email est déjà utilisé."] } };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, name: name || null, passwordHash, accountType },
  });

  await createSession(user.id, accountType as AccountType);
  redirect("/");
}

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  // Comparaison systématique même si l'utilisateur n'existe pas (anti-timing).
  const hash = user?.passwordHash ?? "$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidin";
  const valid = await bcrypt.compare(password, hash);

  if (!user || !valid) {
    return { message: "Email ou mot de passe incorrect." };
  }

  await createSession(user.id, user.accountType as AccountType);
  redirect("/");
}

export async function logout(): Promise<void> {
  await deleteSession();
  redirect("/login");
}
