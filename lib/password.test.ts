import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password helpers", () => {
  it("genera un hash verificable y no reutiliza el salt", async () => {
    const first = await hashPassword("metrobus-seguro-123");
    const second = await hashPassword("metrobus-seguro-123");

    expect(first).not.toBe(second);
    await expect(verifyPassword("metrobus-seguro-123", first)).resolves.toBe(true);
    await expect(verifyPassword("otra-clave", first)).resolves.toBe(false);
  });
});
