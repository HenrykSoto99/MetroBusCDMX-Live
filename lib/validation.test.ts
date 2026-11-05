import { describe, expect, it } from "vitest";
import { credentialsSchema, registerInputSchema } from "./validation";

describe("auth validation", () => {
  it("normaliza email y acepta un registro válido", () => {
    const result = registerInputSchema.safeParse({
      name: " Ana Pérez ",
      email: " ANA@EXAMPLE.COM ",
      password: "una-clave-larga-123",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Ana Pérez");
      expect(result.data.email).toBe("ana@example.com");
    }
  });

  it("rechaza contraseña corta y correo inválido", () => {
    expect(credentialsSchema.safeParse({ email: "no-es-correo", password: "corta" }).success).toBe(false);
  });
});
