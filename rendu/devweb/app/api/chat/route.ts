import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getAssistant } from "@/lib/assistants";
import { startChat, type ChatMessage } from "@/lib/inference";

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
      data: { userId: session.userId, title: content.slice(0, 60) },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
  }

  const history: ChatMessage[] = conversation.messages.map((m) => ({
    role: m.role as ChatMessage["role"],
    content: m.content,
  }));

  // Persiste le message utilisateur immédiatement.
  await prisma.message.create({
    data: { conversationId: conversation.id, role: "user", content },
  });

  const messages: ChatMessage[] = [
    { role: "system", content: assistant.systemPrompt },
    ...history,
    { role: "user", content },
  ];

  // Le fetch initial est await ici → erreur de connexion = 502 propre.
  let source: AsyncIterable<string>;
  try {
    source = await startChat(messages, assistant.kind);
  } catch {
    return new Response("Serveur d'inférence injoignable", { status: 502 });
  }

  const convId = conversation.id;
  const encoder = new TextEncoder();
  let assistantText = "";

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of source) {
          assistantText += chunk;
          controller.enqueue(encoder.encode(chunk));
        }
      } finally {
        await prisma.message.create({
          data: { conversationId: convId, role: "assistant", content: assistantText },
        });
        await prisma.conversation.update({
          where: { id: convId },
          data: { updatedAt: new Date() },
        });
        controller.close();
      }
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
