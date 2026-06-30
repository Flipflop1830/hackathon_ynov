"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Plus } from "lucide-react";

import { Button } from "@/components/atoms/button";
import { ConversationItem } from "@/components/molecules/conversation-item";

export type ConversationSummary = { id: string; title: string };

export function ConversationSidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
}: {
  conversations: ConversationSummary[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}) {
  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950/40">
      <div className="p-3">
        <Button variant="outline" className="w-full justify-start" onClick={onNew}>
          <Plus className="h-4 w-4" />
          Nouvelle conversation
        </Button>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-2 pb-3">
        <AnimatePresence initial={false}>
          {conversations.map((c) => (
            <motion.div
              key={c.id}
              layout
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, height: 0 }}
            >
              <ConversationItem
                title={c.title}
                active={c.id === activeId}
                onSelect={() => onSelect(c.id)}
                onDelete={() => onDelete(c.id)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
        {conversations.length === 0 && (
          <p className="px-2.5 py-4 text-xs text-zinc-600">Aucune conversation pour l’instant.</p>
        )}
      </nav>
    </aside>
  );
}
