export const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434";

export type OllamaRole = "system" | "user" | "assistant";
export type OllamaMessage = { role: OllamaRole; content: string };

/**
 * Parse une ligne NDJSON renvoyée par Ollama `/api/chat` (stream).
 * Retourne le delta de contenu et l'état `done`, ou null si la ligne est vide
 * / illisible. Fonction pure → testée unitairement.
 */
export function parseOllamaChatLine(line: string): { content: string; done: boolean } | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  try {
    const obj = JSON.parse(trimmed) as {
      message?: { content?: string };
      done?: boolean;
      error?: string;
    };
    if (obj.error) throw new Error(obj.error);
    return {
      content: obj.message?.content ?? "",
      done: Boolean(obj.done),
    };
  } catch {
    return null;
  }
}

/** Vérifie qu'Ollama répond et liste les modèles disponibles. */
export async function checkOllama(): Promise<{ connected: boolean; models: string[] }> {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`, {
      cache: "no-store",
      signal: AbortSignal.timeout(2500),
    });
    if (!res.ok) return { connected: false, models: [] };
    const data = (await res.json()) as { models?: { name: string }[] };
    return { connected: true, models: (data.models ?? []).map((m) => m.name) };
  } catch {
    return { connected: false, models: [] };
  }
}
