import { describe, expect, it } from "vitest";

import { getAssistant } from "./assistants";

describe("getAssistant", () => {
  it("route un compte finance vers le modèle financier", () => {
    const a = getAssistant("finance");
    expect(a.model).toBe(process.env.OLLAMA_MODEL_FINANCE ?? "phi35-financial");
    expect(a.label).toBe("Assistant Financier");
    expect(a.disclaimer).toBeUndefined();
    expect(a.systemPrompt).toMatch(/financial/i);
  });

  it("route un compte medical vers l'assistant médical avec disclaimer", () => {
    const a = getAssistant("medical");
    expect(a.label).toBe("Assistant Médical");
    expect(a.disclaimer).toBeTruthy();
    expect(a.systemPrompt).toMatch(/medical/i);
  });
});
