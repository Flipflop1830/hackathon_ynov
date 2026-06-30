"use client";

import { useCallback, useEffect, useState } from "react";

import { ConversationSidebar, type ConversationSummary } from "./conversation-sidebar";
import { ChatWindow, type ChatMessage } from "./chat-window";

export function ChatExperience({
  assistantLabel,
  disclaimer,
}: {
  assistantLabel: string;
  disclaimer?: string;
}) {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState(false);

  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/conversations", { cache: "no-store" });
      if (res.ok) setConversations(await res.json());
    } catch {
      /* hors-ligne : on garde la liste courante */
    }
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const res = await fetch("/api/conversations", { cache: "no-store" });
        if (active && res.ok) setConversations(await res.json());
      } catch {
        /* hors-ligne au chargement : liste vide */
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const selectConversation = useCallback(async (id: string) => {
    setActiveId(id);
    try {
      const res = await fetch(`/api/conversations/${id}`, { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as { messages: ChatMessage[] };
        setMessages(data.messages);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const newConversation = useCallback(() => {
    setActiveId(null);
    setMessages([]);
  }, []);

  const deleteConversation = useCallback(
    async (id: string) => {
      try {
        await fetch(`/api/conversations/${id}`, { method: "DELETE" });
      } catch {
        /* ignore */
      }
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (id === activeId) newConversation();
    },
    [activeId, newConversation],
  );

  const sendMessage = useCallback(
    async (text: string) => {
      if (streaming) return;

      setMessages((prev) => [...prev, { role: "user", content: text }, { role: "assistant", content: "" }]);
      setStreaming(true);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: text, conversationId: activeId }),
        });

        if (!res.ok || !res.body) {
          throw new Error(res.status === 502 ? "Serveur d'inférence injoignable." : "Erreur serveur.");
        }

        const newId = res.headers.get("X-Conversation-Id");
        const isNew = newId && newId !== activeId;
        if (newId) setActiveId(newId);

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          setMessages((prev) => {
            const next = [...prev];
            const lastIdx = next.length - 1;
            next[lastIdx] = { ...next[lastIdx], content: next[lastIdx].content + chunk };
            return next;
          });
        }

        if (isNew) void loadConversations();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erreur inconnue.";
        setMessages((prev) => {
          const next = [...prev];
          const lastIdx = next.length - 1;
          next[lastIdx] = { role: "assistant", content: `⚠️ ${message}` };
          return next;
        });
      } finally {
        setStreaming(false);
      }
    },
    [activeId, streaming, loadConversations],
  );

  return (
    <div className="flex min-h-0 flex-1">
      <ConversationSidebar
        conversations={conversations}
        activeId={activeId}
        onSelect={selectConversation}
        onNew={newConversation}
        onDelete={deleteConversation}
      />
      <main className="min-w-0 flex-1">
        <ChatWindow
          messages={messages}
          streaming={streaming}
          assistantLabel={assistantLabel}
          disclaimer={disclaimer}
          onSend={sendMessage}
        />
      </main>
    </div>
  );
}
