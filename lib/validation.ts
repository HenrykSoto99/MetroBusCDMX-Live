import { z } from "zod";
const email = z.string({ error: "El correo electrónico es obligatorio." }).trim().toLowerCase().max(254, "El correo electrónico es demasiado largo.").email("Ingresa un correo electrónico válido.");
const password = z.string({ error: "La contraseña es obligatoria." }).min(10, "La contraseña debe tener al menos 10 caracteres.").max(128, "La contraseña no puede superar 128 caracteres.");
export const credentialsSchema = z.object({ email, password });
export const registerInputSchema = z.object({
  name: z.string({ error: "El nombre es obligatorio." }).trim().min(2, "El nombre debe tener al menos 2 caracteres.").max(70, "El nombre no puede superar 70 caracteres."), email, password,
});
export function firstValidationMessage(error: z.ZodError): string { return error.issues[0]?.message ?? "Revisa los datos e inténtalo de nuevo."; }
