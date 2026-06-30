import { Logo } from "@/components/atoms/logo";
import { AuthForm } from "@/components/organisms/auth-form";

export default function LoginPage() {
  return (
    <div className="space-y-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 shadow-xl">
      <div className="space-y-2 text-center">
        <Logo className="justify-center" />
        <h1 className="text-xl font-semibold text-zinc-100">Connexion</h1>
        <p className="text-sm text-zinc-400">Accédez à votre assistant TechCorp.</p>
      </div>
      <AuthForm mode="login" />
    </div>
  );
}
