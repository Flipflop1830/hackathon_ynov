"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ConversationSidebar, type ConversationSummary } from "./conversation-sidebar";
import { ChatWindow, type ChatMessage } from "./chat-window";

type ChatState = { messages: ChatMessage[]; streaming: boolean };

export function ChatExperience({
  assistantLabel,
  disclaimer,
}: {
  assistantLabel: string;
  disclaimer?: string;
}) {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  // État PAR conversation → plusieurs chats peuvent streamer en parallèle.
  const [chats, setChats] = useState<Record<string, ChatState>>({});

  // Miroir ref pour lire l'état courant sans recréer les callbacks.
  const chatsRef = useRef(chats);
  chatsRef.current = chats;

  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/conversations", { cache: "no-store" });
      if (res.ok) setConversations(await res.json());
    } catch {
      /* hors-ligne : on garde la liste */
    }
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const res = await fetch("/api/conversations", { cache: "no-store" });
        if (active && res.ok) setConversations(await res.json());
      } catch {
        /* liste vide au chargement */
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const selectConversation = useCallback(async (id: string) => {
    setActiveId(id);
    // Ne pas recharger si déjà en mémoire (stream en cours ou déjà chargé) :
    // cela écraserait un flux en cours.
    if (chatsRef.current[id]) return;
    try {
      const res = await fetch(`/api/conversations/${id}`, { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as { messages: ChatMessage[] };
        setChats((prev) => ({ ...prev, [id]: { messages: data.messages, streaming: false } }));
      }
    } catch {
      /* ignore */
    }
  }, []);

  const newConversation = useCallback(() => {
    setActiveId(null);
  }, []);

  const deleteConversation = useCallback(
    async (id: string) => {
      try {
        await fetch(`/api/conversations/${id}`, { method: "DELETE" });
      } catch {
        /* ignore */
      }
      setConversations((prev) => prev.filter((c) => c.id !== id));
      setChats((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setActiveId((a) => (a === id ? null : a));
    },
    [],
  );

  const sendMessage = useCallback(
    async (text: string) => {
      // Identifiant du chat ciblé (réel, ou temporaire pour une nouvelle conversation).
      const id = activeId ?? `temp-${Date.now()}`;
      if (!activeId) setActiveId(id);

      // Verrou PAR conversation : on bloque uniquement CE chat, pas les autres.
      if (chatsRef.current[id]?.streaming) return;

      const base = chatsRef.current[id]?.messages ?? [];
      // `local` est la source de vérité de CE flux (évite les courses sur setState).
      const local: ChatMessage[] = [
        ...base,
        { role: "user", content: text },
        { role: "assistant", content: "" },
      ];
      setChats((prev) => ({ ...prev, [id]: { messages: [...local], streaming: true } }));

      let targetId = id;
      try {
        const isTemp = id.startsWith("temp-");
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: text, conversationId: isTemp ? undefined : id }),
        });

        if (!res.ok || !res.body) {
          const text = await res.text().catch(() => "");
          throw new Error(text || "Erreur serveur.");
        }

        // Réconcilie l'id temporaire avec l'id réel renvoyé par le serveur.
        const newId = res.headers.get("X-Conversation-Id");
        if (newId && newId !== id) {
          setChats((prev) => {
            const cur = prev[id] ?? { messages: [...local], streaming: true };
            const next = { ...prev };
            delete next[id];
            next[newId] = cur;
            return next;
          });
          setActiveId((a) => (a === id ? newId : a));
          targetId = newId;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          local[local.length - 1] = {
            ...local[local.length - 1],
            content: local[local.length - 1].content + chunk,
          };
          const snapshot = [...local];
          setChats((prev) => ({ ...prev, [targetId]: { messages: snapshot, streaming: true } }));
        }

        setChats((prev) => ({ ...prev, [targetId]: { messages: [...local], streaming: false } }));
        void loadConversations();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erreur inconnue.";
        local[local.length - 1] = { role: "assistant", content: `⚠️ ${message}` };
        const snapshot = [...local];
        setChats((prev) => ({ ...prev, [targetId]: { messages: snapshot, streaming: false } }));
      }
    },
    [activeId, loadConversations],
  );

  const current = activeId ? chats[activeId] : undefined;
  const streamingIds = useMemo(
    () => new Set(Object.entries(chats).filter(([, c]) => c.streaming).map(([id]) => id)),
    [chats],
  );

  return (
    <div className="flex min-h-0 flex-1">
      <ConversationSidebar
        conversations={conversations}
        activeId={activeId}
        streamingIds={streamingIds}
        onSelect={selectConversation}
        onNew={newConversation}
        onDelete={deleteConversation}
      />
      <main className="min-w-0 flex-1">
        <ChatWindow
          messages={current?.messages ?? []}
          streaming={current?.streaming ?? false}
          assistantLabel={assistantLabel}
          disclaimer={disclaimer}
          onSend={sendMessage}
        />
      </main>
    </div>
  );
}
