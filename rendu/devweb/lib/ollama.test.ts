import { describe, expect, it } from "vitest";

import { parseOllamaChatLine } from "./ollama";

describe("parseOllamaChatLine", () => {
  it("extrait le delta de contenu d'une ligne valide", () => {
    const line = JSON.stringify({ message: { role: "assistant", content: "Bonjour" }, done: false });
    expect(parseOllamaChatLine(line)).toEqual({ content: "Bonjour", done: false });
  });

  it("détecte la fin du stream", () => {
    const line = JSON.stringify({ message: { content: "" }, done: true });
    expect(parseOllamaChatLine(line)).toEqual({ content: "", done: true });
  });

  it("retourne null sur une ligne vide", () => {
    expect(parseOllamaChatLine("   ")).toBeNull();
  });

  it("retourne null sur du JSON invalide", () => {
    expect(parseOllamaChatLine("{not json")).toBeNull();
  });

  it("retourne null si Ollama renvoie une erreur", () => {
    expect(parseOllamaChatLine(JSON.stringify({ error: "model not found" }))).toBeNull();
  });
});
