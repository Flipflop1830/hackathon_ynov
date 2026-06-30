import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

// Récupère les messages d'une conversation (vérifie la propriété).
export async function GET(_req: Request, { params }: Ctx) {
  const session = await getSession();
  if (!session) return new Response("Non authentifié", { status: 401 });

  const { id } = await params;
  const conversation = await prisma.conversation.findFirst({
    where: { id, userId: session.userId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  if (!conversation) return new Response("Introuvable", { status: 404 });

  return Response.json(
    {
      id: conversation.id,
      title: conversation.title,
      messages: conversation.messages.map((m) => ({ role: m.role, content: m.content })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

// Supprime une conversation (vérifie la propriété).
export async function DELETE(_req: Request, { params }: Ctx) {
  const session = await getSession();
  if (!session) return new Response("Non authentifié", { status: 401 });

  const { id } = await params;
  const result = await prisma.conversation.deleteMany({
    where: { id, userId: session.userId },
  });

  if (result.count === 0) return new Response("Introuvable", { status: 404 });
  return new Response(null, { status: 204 });
}
