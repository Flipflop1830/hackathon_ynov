import { Logo } from "@/components/atoms/logo";
import { AuthForm } from "@/components/organisms/auth-form";

export default function RegisterPage() {
  return (
    <div className="space-y-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 shadow-xl">
      <div className="space-y-2 text-center">
        <Logo className="justify-center" />
        <h1 className="text-xl font-semibold text-zinc-100">Créer un compte</h1>
        <p className="text-sm text-zinc-400">Choisissez votre type d’assistant.</p>
      </div>
      <AuthForm mode="register" />
    </div>
  );
}
