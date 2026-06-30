"use client";

import { useEffect, useRef } from "react";
import { Sparkles } from "lucide-react";

import { MessageBubble } from "@/components/molecules/message-bubble";
import { TypingIndicator } from "@/components/molecules/typing-indicator";
import { ChatInput } from "@/components/molecules/chat-input";
import type { ChatRole } from "@/lib/types";

export type ChatMessage = { role: ChatRole; content: string };

export function ChatWindow({
  messages,
  streaming,
  assistantLabel,
  disclaimer,
  onSend,
}: {
  messages: ChatMessage[];
  streaming: boolean;
  assistantLabel: string;
  disclaimer?: string;
  onSend: (text: string) => void;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  const last = messages[messages.length - 1];
  const showTyping = streaming && last?.role === "assistant" && last.content === "";
  const visible = showTyping ? messages.slice(0, -1) : messages;

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto flex max-w-3xl flex-col gap-5">
          {messages.length === 0 && (
            <div className="mt-16 flex flex-col items-center text-center text-zinc-400">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-zinc-800 text-emerald-400">
                <Sparkles className="h-6 w-6" />
              </span>
              <h2 className="mt-4 text-lg font-semibold text-zinc-200">{assistantLabel}</h2>
              <p className="mt-1 max-w-sm text-sm">
                Posez une question pour démarrer la conversation. Vos échanges sont enregistrés
                dans votre historique.
              </p>
            </div>
          )}

          {visible.map((m, i) => (
            <MessageBubble
              key={i}
              role={m.role}
              content={m.content}
              streaming={streaming && !showTyping && i === visible.length - 1 && m.role === "assistant"}
            />
          ))}
          {showTyping && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="border-t border-zinc-800 bg-zinc-950/60 px-4 py-3">
        <div className="mx-auto max-w-3xl">
          <ChatInput onSend={onSend} disabled={streaming} />
          {disclaimer && <p className="mt-2 text-center text-xs text-zinc-500">{disclaimer}</p>}
        </div>
      </div>
    </div>
  );
}
