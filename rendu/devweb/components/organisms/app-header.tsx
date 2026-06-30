import { LogOut } from "lucide-react";

import { logout } from "@/app/actions/auth";
import { Logo } from "@/components/atoms/logo";
import { Button } from "@/components/atoms/button";
import { AccountTypeBadge } from "@/components/molecules/account-type-badge";
import { ConnectionBadge } from "@/components/molecules/connection-badge";
import type { AccountType } from "@/lib/types";

export function AppHeader({
  email,
  accountType,
}: {
  email: string;
  accountType: AccountType;
}) {
  return (
    <header className="flex items-center justify-between border-b border-zinc-800 bg-zinc-950/80 px-4 py-3 backdrop-blur">
      <Logo />
      <div className="flex items-center gap-3">
        <ConnectionBadge />
        <AccountTypeBadge type={accountType} />
        <span className="hidden text-sm text-zinc-400 sm:inline">{email}</span>
        <form action={logout}>
          <Button variant="ghost" size="sm" type="submit" title="Se déconnecter">
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Déconnexion</span>
          </Button>
        </form>
      </div>
    </header>
  );
}
