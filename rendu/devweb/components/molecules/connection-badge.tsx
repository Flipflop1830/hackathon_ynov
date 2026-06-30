"use client";

import { useEffect, useState } from "react";

import { StatusDot } from "@/components/atoms/status-dot";
import { cn } from "@/lib/utils";

type State = "online" | "offline" | "unknown";

export function ConnectionBadge({ className }: { className?: string }) {
  const [state, setState] = useState<State>("unknown");

  useEffect(() => {
    let active = true;

    const check = async () => {
      try {
        const res = await fetch("/api/health", { cache: "no-store" });
        const data = (await res.json()) as { connected: boolean };
        if (active) setState(data.connected ? "online" : "offline");
      } catch {
        if (active) setState("offline");
      }
    };

    check();
    const id = setInterval(check, 5000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  const label =
    state === "online" ? "Connecté" : state === "offline" ? "Déconnecté" : "Vérification…";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-zinc-700/80 bg-zinc-900/60 px-2.5 py-1 text-xs text-zinc-300",
        className,
      )}
      title="État du serveur d'inférence Ollama"
    >
      <StatusDot state={state} />
      {label}
    </span>
  );
}
