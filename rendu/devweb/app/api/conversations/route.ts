import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

// Liste les conversations de l'utilisateur courant (les plus récentes d'abord).
export async function GET() {
  const session = await getSession();
  if (!session) {
    return new Response("Non authentifié", { status: 401 });
  }

  const conversations = await prisma.conversation.findMany({
    where: { userId: session.userId },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, updatedAt: true },
  });

  return Response.json(conversations, { headers: { "Cache-Control": "no-store" } });
}
