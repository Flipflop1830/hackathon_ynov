import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getAssistant } from "@/lib/assistants";
import {
  OLLAMA_URL,
  parseOllamaChatLine,
  type OllamaMessage,
  type OllamaRole,
} from "@/lib/ollama";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return new Response("Non authentifié", { status: 401 });
  }

  let body: { content?: unknown; conversationId?: unknown };
  try {
    body = await req.json();
  } catch {
    return new Response("Corps de requête invalide", { status: 400 });
  }

  const content = typeof body.content === "string" ? body.content.trim() : "";
  const conversationId = typeof body.conversationId === "string" ? body.conversationId : undefined;
  if (!content) {
    return new Response("Message vide", { status: 400 });
  }

  const assistant = getAssistant(session.accountType);

  // Charge la conversation existante (et son historique) ou en crée une nouvelle.
  let conversation = conversationId
    ? await prisma.conversation.findFirst({
        where: { id: conversationId, userId: session.userId },
        include: { messages: { orderBy: { createdAt: "asc" } } },
      })
    : null;

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        userId: session.userId,
        title: content.slice(0, 60),
      },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
  }

  const history: OllamaMessage[] = conversation.messages.map((m) => ({
    role: m.role as OllamaRole,
    content: m.content,
  }));

  // Persiste le message utilisateur immédiatement.
  await prisma.message.create({
    data: { conversationId: conversation.id, role: "user", content },
  });

  const messages: OllamaMessage[] = [
    { role: "system", content: assistant.systemPrompt },
    ...history,
    { role: "user", content },
  ];

  let ollamaRes: Response;
  try {
    ollamaRes = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: assistant.model, messages, stream: true }),
    });
  } catch {
    return new Response("Serveur Ollama injoignable", { status: 502 });
  }

  if (!ollamaRes.ok || !ollamaRes.body) {
    return new Response("Erreur du serveur de modèle", { status: 502 });
  }

  const convId = conversation.id;
  const reader = ollamaRes.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let assistantText = "";
  let buffer = "";

  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { done, value } = await reader.read();

      if (done) {
        if (buffer.trim()) {
          const parsed = parseOllamaChatLine(buffer);
          if (parsed?.content) {
            assistantText += parsed.content;
            controller.enqueue(encoder.encode(parsed.content));
          }
        }
        // Persiste la réponse complète de l'assistant.
        await prisma.message.create({
          data: { conversationId: convId, role: "assistant", content: assistantText },
        });
        await prisma.conversation.update({
          where: { id: convId },
          data: { updatedAt: new Date() },
        });
        controller.close();
        return;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const parsed = parseOllamaChatLine(line);
        if (parsed?.content) {
          assistantText += parsed.content;
          controller.enqueue(encoder.encode(parsed.content));
        }
      }
    },
    cancel() {
      void reader.cancel();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Conversation-Id": convId,
      "Cache-Control": "no-store",
    },
  });
}
