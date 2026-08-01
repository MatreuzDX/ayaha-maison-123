"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/server/db";
import { registerClient } from "@/server/client-auth";
import { AppError } from "@/server/errors";
import { MIN_PASSWORD_LENGTH } from "@/lib/demo";
import { normalizePhone } from "@/lib/format";

const schema = z
  .object({
    firstName: z.string().trim().min(1, "Indique o seu primeiro nome."),
    lastName: z.string().trim().optional(),
    email: z.string().trim().min(1, "Indique o e-mail.").email("E-mail inválido."),
    phone: z.string().trim().min(1, "Indique o telefone."),
    password: z
      .string()
      .min(MIN_PASSWORD_LENGTH, `A palavra-passe tem de ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As palavras-passe não coincidem.",
    path: ["confirmPassword"],
  });

export interface RegisterState {
  error?: string;
  fieldErrors?: Record<string, string | undefined>;
}

export async function registerClientAction(
  _prev: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const parsed = schema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    const flat = z.flattenError(parsed.error);
    return {
      fieldErrors: {
        firstName: flat.fieldErrors.firstName?.[0],
        email: flat.fieldErrors.email?.[0],
        phone: flat.fieldErrors.phone?.[0],
        password: flat.fieldErrors.password?.[0],
        confirmPassword: flat.fieldErrors.confirmPassword?.[0],
      },
    };
  }

  const phone = normalizePhone(parsed.data.phone);
  if (!phone) {
    return { fieldErrors: { phone: "Telefone inválido. Use o formato português." } };
  }

  try {
    const slug = process.env.DEFAULT_UNIT_SLUG ?? "benfica";
    const unit = await prisma.unit.findUnique({ where: { slug } });
    if (!unit) {
      return { error: "Não foi possível criar a conta. Tente novamente mais tarde." };
    }

    await registerClient({
      unitId: unit.id,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName || undefined,
      email: parsed.data.email,
      phone,
      password: parsed.data.password,
    });
  } catch (err) {
    if (err instanceof AppError) return { error: err.message };
    console.error("[registerClient]", err);
    return { error: "Não foi possível criar a conta. Tente novamente." };
  }

  // `redirect` atira internamente — tem de ficar fora do try/catch.
  redirect("/conta");
}
