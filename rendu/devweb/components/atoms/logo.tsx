import { Landmark } from "lucide-react";

import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-semibold tracking-tight", className)}>
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-600 text-white">
        <Landmark className="h-4 w-4" />
      </span>
      <span className="text-zinc-100">
        TechCorp<span className="text-emerald-500"> AI</span>
      </span>
    </span>
  );
}
