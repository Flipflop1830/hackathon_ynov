import * as z from "zod";

import { ACCOUNT_TYPES } from "./types";

export const SignupSchema = z.object({
  name: z.string().trim().min(2, "Le nom doit faire au moins 2 caractères.").optional().or(z.literal("")),
  email: z.string().trim().toLowerCase().email("Email invalide."),
  password: z.string().min(8, "Au moins 8 caractères.").regex(/[0-9]/, "Au moins un chiffre."),
  accountType: z.enum(ACCOUNT_TYPES, { message: "Type de compte invalide." }),
});

export const LoginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Email invalide."),
  password: z.string().min(1, "Mot de passe requis."),
});

export type FormState =
  | {
      errors?: {
        name?: string[];
        email?: string[];
        password?: string[];
        accountType?: string[];
      };
      message?: string;
    }
  | undefined;
