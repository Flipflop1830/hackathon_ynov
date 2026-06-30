"use client";

import { MessageSquare, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";

export function ConversationItem({
  title,
  active,
  onSelect,
  onDelete,
}: {
  title: string;
  active: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={cn(
        "group flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors",
        active ? "bg-zinc-800 text-zinc-100" : "text-zinc-400 hover:bg-zinc-800/60",
      )}
    >
      <button onClick={onSelect} className="flex min-w-0 flex-1 items-center gap-2 text-left">
        <MessageSquare className="h-4 w-4 shrink-0" />
        <span className="truncate">{title}</span>
      </button>
      <button
        onClick={onDelete}
        aria-label="Supprimer la conversation"
        className="shrink-0 rounded p-1 text-zinc-500 opacity-0 transition hover:text-red-400 group-hover:opacity-100"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
