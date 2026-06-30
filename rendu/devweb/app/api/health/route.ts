import { checkOllama, OLLAMA_URL } from "@/lib/ollama";

// Statut de connexion au serveur d'inférence Ollama (utilisé par le badge UI).
export async function GET() {
  const { connected, models } = await checkOllama();
  return Response.json(
    { connected, models, url: OLLAMA_URL },
    { headers: { "Cache-Control": "no-store" } },
  );
}
