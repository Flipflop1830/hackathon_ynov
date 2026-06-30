import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { ConnectionBadge } from "./connection-badge";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ConnectionBadge", () => {
  it("affiche 'Connecté' quand Ollama répond", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ json: async () => ({ connected: true }) }),
    );
    render(<ConnectionBadge />);
    expect(await screen.findByText("Connecté")).toBeInTheDocument();
  });

  it("affiche 'Déconnecté' quand le fetch échoue", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    render(<ConnectionBadge />);
    expect(await screen.findByText("Déconnecté")).toBeInTheDocument();
  });
});
