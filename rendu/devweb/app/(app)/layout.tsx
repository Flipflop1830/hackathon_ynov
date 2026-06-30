import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/dal";
import { AppHeader } from "@/components/organisms/app-header";
import type { AccountType } from "@/lib/types";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="flex h-screen flex-col">
      <AppHeader email={user.email} accountType={user.accountType as AccountType} />
      <div className="flex min-h-0 flex-1">{children}</div>
    </div>
  );
}
