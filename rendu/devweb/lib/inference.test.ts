import { describe, expect, it } from "vitest";

import { extractAssistantReply, formatPhi3Prompt } from "./inference";

describe("formatPhi3Prompt", () => {
  it("construit un prompt au format chat Phi-3 terminé par le tour assistant", () => {
    const p = formatPhi3Prompt([
      { role: "system", content: "Sys" },
      { role: "user", content: "Salut" },
    ]);
    expect(p).toBe("<|system|>\nSys<|end|>\n<|user|>\nSalut<|end|>\n<|assistant|>\n");
  });
});

describe("extractAssistantReply", () => {
  it("extrait la réponse après le marqueur assistant (Triton ré-échoe le prompt)", () => {
    const full =
      "<|user|>\nWhat is compound interest?<|end|>\n<|assistant|>\n Compound interest is interest on interest.";
    expect(extractAssistantReply(full)).toBe("Compound interest is interest on interest.");
  });

  it("coupe les tours supplémentaires éventuels", () => {
    const full = "<|assistant|>\nRéponse.<|end|>\n<|user|>\nAutre question";
    expect(extractAssistantReply(full)).toBe("Réponse.");
  });

  it("retombe sur le texte brut s'il n'y a pas de marqueur", () => {
    expect(extractAssistantReply("Juste du texte")).toBe("Juste du texte");
  });
});
