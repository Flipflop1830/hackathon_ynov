import { describe, expect, it } from "vitest";

import { LoginSchema, SignupSchema } from "./definitions";

describe("SignupSchema", () => {
  it("accepte des données valides", () => {
    const r = SignupSchema.safeParse({
      name: "Jane",
      email: "JANE@TECHCORP.COM",
      password: "secret123",
      accountType: "finance",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.email).toBe("jane@techcorp.com"); // normalisé
  });

  it("rejette un email invalide", () => {
    const r = SignupSchema.safeParse({
      email: "pas-un-email",
      password: "secret123",
      accountType: "finance",
    });
    expect(r.success).toBe(false);
  });

  it("rejette un mot de passe sans chiffre ou trop court", () => {
    expect(SignupSchema.safeParse({ email: "a@b.com", password: "short", accountType: "finance" }).success).toBe(false);
    expect(SignupSchema.safeParse({ email: "a@b.com", password: "longbutnonum", accountType: "finance" }).success).toBe(false);
  });

  it("rejette un type de compte inconnu", () => {
    const r = SignupSchema.safeParse({ email: "a@b.com", password: "secret123", accountType: "admin" });
    expect(r.success).toBe(false);
  });
});

describe("LoginSchema", () => {
  it("exige email et mot de passe", () => {
    expect(LoginSchema.safeParse({ email: "a@b.com", password: "x" }).success).toBe(true);
    expect(LoginSchema.safeParse({ email: "a@b.com", password: "" }).success).toBe(false);
  });
});
