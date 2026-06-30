"use client";

import { motion } from "framer-motion";
import { Bot, User } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ChatRole } from "@/lib/types";

export function MessageBubble({ role, content }: { role: ChatRole; content: string }) {
  const isUser = role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={cn("flex w-full gap-3", isUser ? "flex-row-reverse" : "flex-row")}
    >
      <div
        className={cn(
          "grid h-8 w-8 shrink-0 place-items-center rounded-lg",
          isUser ? "bg-emerald-600 text-white" : "bg-zinc-800 text-emerald-400",
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div
        className={cn(
          "max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
          isUser
            ? "rounded-tr-sm bg-emerald-600 text-white"
            : "rounded-tl-sm bg-zinc-800 text-zinc-100",
        )}
      >
        {content || "…"}
      </div>
    </motion.div>
  );
}
