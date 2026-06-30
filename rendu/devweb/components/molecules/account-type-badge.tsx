import { Stethoscope, TrendingUp } from "lucide-react";

import { cn } from "@/lib/utils";
import type { AccountType } from "@/lib/types";

export function AccountTypeBadge({
  type,
  className,
}: {
  type: AccountType;
  className?: string;
}) {
  const isFinance = type === "finance";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        isFinance
          ? "bg-emerald-500/15 text-emerald-400"
          : "bg-sky-500/15 text-sky-400",
        className,
      )}
    >
      {isFinance ? <TrendingUp className="h-3.5 w-3.5" /> : <Stethoscope className="h-3.5 w-3.5" />}
      {isFinance ? "Finance" : "Médical"}
    </span>
  );
}
