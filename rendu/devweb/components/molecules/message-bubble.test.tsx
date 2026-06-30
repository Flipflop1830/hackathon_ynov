import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { MessageBubble } from "./message-bubble";

describe("MessageBubble", () => {
  it("affiche le contenu d'un message utilisateur", () => {
    render(<MessageBubble role="user" content="Bonjour TechCorp" />);
    expect(screen.getByText("Bonjour TechCorp")).toBeInTheDocument();
  });

  it("affiche le contenu d'un message assistant", () => {
    render(<MessageBubble role="assistant" content="Réponse financière" />);
    expect(screen.getByText("Réponse financière")).toBeInTheDocument();
  });
});
