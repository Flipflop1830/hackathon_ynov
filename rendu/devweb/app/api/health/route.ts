import { checkInference } from "@/lib/inference";

// Statut de connexion au serveur d'inférence (utilisé par le badge UI).
export async function GET() {
  const { connected, backend } = await checkInference();
  return Response.json(
    { connected, backend },
    { headers: { "Cache-Control": "no-store" } },
  );
}
