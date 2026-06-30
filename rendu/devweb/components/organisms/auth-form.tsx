"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Stethoscope, TrendingUp } from "lucide-react";

import { login, signup } from "@/app/actions/auth";
import { Button } from "@/components/atoms/button";
import { AuthField } from "@/components/molecules/auth-field";
import { cn } from "@/lib/utils";
import { ACCOUNT_TYPES, type AccountType } from "@/lib/types";
import { useState } from "react";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const isRegister = mode === "register";
  const action = isRegister ? signup : login;
  const [state, formAction, pending] = useActionState(action, undefined);
  const [accountType, setAccountType] = useState<AccountType>("finance");

  return (
    <form action={formAction} className="space-y-4">
      {isRegister && (
        <AuthField label="Nom (optionnel)" name="name" placeholder="Jane Doe" errors={state?.errors?.name} />
      )}
      <AuthField
        label="Email"
        name="email"
        type="email"
        placeholder="vous@techcorp.com"
        autoComplete="email"
        errors={state?.errors?.email}
      />
      <AuthField
        label="Mot de passe"
        name="password"
        type="password"
        placeholder="••••••••"
        autoComplete={isRegister ? "new-password" : "current-password"}
        errors={state?.errors?.password}
      />

      {isRegister && (
        <div className="space-y-1.5">
          <span className="text-sm font-medium text-zinc-300">Type de compte</span>
          <input type="hidden" name="accountType" value={accountType} />
          <div className="grid grid-cols-2 gap-2">
            {ACCOUNT_TYPES.map((type) => {
              const selected = accountType === type;
              const isFinance = type === "finance";
              return (
                <button
                  type="button"
                  key={type}
                  onClick={() => setAccountType(type)}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-lg border p-3 text-sm transition",
                    selected
                      ? "border-emerald-500 bg-emerald-500/10 text-zinc-100"
                      : "border-zinc-700 text-zinc-400 hover:border-zinc-600",
                  )}
                >
                  {isFinance ? <TrendingUp className="h-5 w-5" /> : <Stethoscope className="h-5 w-5" />}
                  {isFinance ? "Finance" : "Médical"}
                </button>
              );
            })}
          </div>
          {state?.errors?.accountType?.map((e) => (
            <p key={e} className="text-xs text-red-400">
              {e}
            </p>
          ))}
        </div>
      )}

      {state?.message && <p className="text-sm text-red-400">{state.message}</p>}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Veuillez patienter…" : isRegister ? "Créer mon compte" : "Se connecter"}
      </Button>

      <p className="text-center text-sm text-zinc-400">
        {isRegister ? (
          <>
            Déjà un compte ?{" "}
            <Link href="/login" className="text-emerald-400 hover:underline">
              Se connecter
            </Link>
          </>
        ) : (
          <>
            Pas encore de compte ?{" "}
            <Link href="/register" className="text-emerald-400 hover:underline">
              S’inscrire
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
