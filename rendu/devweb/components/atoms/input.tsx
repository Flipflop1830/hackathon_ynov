import * as React from "react";

import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-10 w-full rounded-lg border border-zinc-700 bg-zinc-900/60 px-3 text-sm text-zinc-100",
        "placeholder:text-zinc-500 transition-colors",
        "focus-visible:outline-none focus-visible:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500/40",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
