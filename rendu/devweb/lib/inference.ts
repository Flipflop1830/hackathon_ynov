import { parseOllamaChatLine, type OllamaMessage } from "./ollama";
import type { AccountType } from "./types";

export type ChatMessage = OllamaMessage;

export type Backend = "ollama" | "triton";
export const BACKEND: Backend = (process.env.INFERENCE_BACKEND as Backend) ?? "ollama";

const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434";
const TRITON_URL = process.env.TRITON_URL ?? "http://localhost:8000";
const TRITON_MODEL = process.env.TRITON_MODEL ?? "phi35_financial";

function ollamaModel(kind: AccountType): string {
  return kind === "medical"
    ? (process.env.OLLAMA_MODEL_MEDICAL ?? "phi3.5")
    : (process.env.OLLAMA_MODEL_FINANCE ?? "phi35-financial");
}

/** État de connexion du backend d'inférence (pour le badge). */
export async function checkInference(): Promise<{ connected: boolean; backend: Backend }> {
  try {
    const url =
      BACKEND === "triton" ? `${TRITON_URL}/v2/health/ready` : `${OLLAMA_URL}/api/tags`;
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(2500) });
    return { connected: res.ok, backend: BACKEND };
  } catch {
    return { connected: false, backend: BACKEND };
  }
}

/**
 * Démarre une complétion et renvoie un flux de deltas texte.
 * Le fetch initial est `await` → une panne de connexion lève AVANT le streaming
 * (le route handler peut alors répondre 502 proprement).
 */
export async function startChat(
  messages: ChatMessage[],
  kind: AccountType,
): Promise<AsyncIterable<string>> {
  return BACKEND === "triton" ? startTriton(messages) : startOllama(messages, ollamaModel(kind));
}

// ── Ollama : /api/chat en streaming NDJSON ───────────────────────────────────
async function startOllama(messages: ChatMessage[], model: string): Promise<AsyncIterable<string>> {
  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages, stream: true }),
  });
  if (!res.ok || !res.body) throw new Error("Ollama indisponible");

  return (async function* () {
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const parsed = parseOllamaChatLine(line);
        if (parsed?.content) yield parsed.content;
      }
    }
    const parsed = parseOllamaChatLine(buffer);
    if (parsed?.content) yield parsed.content;
  })();
}

// ── Triton : /v2/models/.../infer (réponse complète) + streaming simulé ───────
async function startTriton(messages: ChatMessage[]): Promise<AsyncIterable<string>> {
  const prompt = formatPhi3Prompt(messages);
  const res = await fetch(`${TRITON_URL}/v2/models/${TRITON_MODEL}/infer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      inputs: [{ name: "text_input", shape: [1], datatype: "BYTES", data: [prompt] }],
    }),
  });
  if (!res.ok) throw new Error("Triton indisponible");

  const json = (await res.json()) as { outputs?: { data?: string[] }[] };
  const full = json.outputs?.[0]?.data?.[0] ?? "";
  const reply = extractAssistantReply(full);

  return (async function* () {
    // Découpe en mots pour recréer un effet de streaming mot à mot.
    for (const chunk of reply.match(/\S+\s*|\s+/g) ?? []) {
      yield chunk;
      await new Promise((r) => setTimeout(r, 18));
    }
  })();
}

/** Construit un prompt au format chat Phi-3 à partir des messages. */
export function formatPhi3Prompt(messages: ChatMessage[]): string {
  let s = "";
  for (const m of messages) s += `<|${m.role}|>\n${m.content}<|end|>\n`;
  return `${s}<|assistant|>\n`;
}

/**
 * Extrait la réponse de l'assistant de la sortie brute de Triton (qui ré-échoe
 * le prompt). Fonction pure → testée unitairement.
 */
export function extractAssistantReply(fullText: string): string {
  const marker = "<|assistant|>";
  const idx = fullText.lastIndexOf(marker);
  const after = idx >= 0 ? fullText.slice(idx + marker.length) : fullText;
  // S'arrête au premier marqueur de tour suivant.
  return after.split(/<\|(?:end|user|system|assistant)\|>/)[0].trim();
}
