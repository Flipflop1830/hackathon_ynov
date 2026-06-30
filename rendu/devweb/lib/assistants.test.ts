import { describe, expect, it } from "vitest";

import { getAssistant } from "./assistants";

describe("getAssistant", () => {
  it("route un compte finance vers l'assistant financier", () => {
    const a = getAssistant("finance");
    expect(a.kind).toBe("finance");
    expect(a.label).toBe("Assistant Financier");
    expect(a.disclaimer).toBeUndefined();
    expect(a.systemPrompt).toMatch(/financial/i);
  });

  it("route un compte medical vers l'assistant médical avec disclaimer", () => {
    const a = getAssistant("medical");
    expect(a.kind).toBe("medical");
    expect(a.label).toBe("Assistant Médical");
    expect(a.disclaimer).toBeTruthy();
    expect(a.systemPrompt).toMatch(/medical/i);
  });
});
