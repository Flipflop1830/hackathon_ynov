import { cn } from "@/lib/utils";

/** Pastille d'état avec halo animé (vert = ok, rouge = ko, gris = inconnu). */
export function StatusDot({
  state,
  className,
}: {
  state: "online" | "offline" | "unknown";
  className?: string;
}) {
  const color =
    state === "online" ? "bg-emerald-500" : state === "offline" ? "bg-red-500" : "bg-zinc-500";

  return (
    <span className={cn("relative flex h-2.5 w-2.5", className)}>
      {state === "online" && (
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
      )}
      <span className={cn("relative inline-flex h-2.5 w-2.5 rounded-full", color)} />
    </span>
  );
}
