"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { verifyPendingSignup } from "@/lib/google-oauth";
import { normalizePhone } from "@/lib/format";
import { completeGoogleSignup } from "@/server/client-auth";
import { prisma } from "@/server/db";
import { AppError } from "@/server/errors";

const PENDING_COOKIE = "ayaha_google_pending";

const schema = z.object({
  phone: z.string().trim().min(1, "Indique o telefone."),
});

export interface CompleteProfileState {
  error?: string;
  fieldErrors?: { phone?: string };
}

export async function completeProfileAction(
  _prev: CompleteProfileState,
  formData: FormData,
): Promise<CompleteProfileState> {
  const cookieStore = await cookies();
  const token = cookieStore.get(PENDING_COOKIE)?.value;
  const pending = token ? verifyPendingSignup(token) : null;

  if (!pending) {
    redirect("/login");
  }

  const parsed = schema.safeParse({ phone: formData.get("phone") });
  if (!parsed.success) {
    return {
      fieldErrors: {
        phone: z.flattenError(parsed.error).fieldErrors.phone?.[0],
      },
    };
  }

  const phone = normalizePhone(parsed.data.phone);
  if (!phone) {
    return {
      fieldErrors: { phone: "Telefone inválido. Use o formato português." },
    };
  }

  try {
    const slug = process.env.DEFAULT_UNIT_SLUG ?? "benfica";
    const unit = await prisma.unit.findUnique({ where: { slug } });
    if (!unit) {
      return {
        error:
          "Não foi possível concluir o registo. Tente novamente mais tarde.",
      };
    }

    await completeGoogleSignup({
      unitId: unit.id,
      googleId: pending.googleId,
      email: pending.email,
      firstName: pending.firstName,
      lastName: pending.lastName,
      phone,
    });
  } catch (err) {
    if (err instanceof AppError) return { error: err.message };
    console.error("[completeGoogleSignup]", err);
    return { error: "Não foi possível concluir o registo. Tente novamente." };
  }

  cookieStore.delete(PENDING_COOKIE);
  // `redirect` atira internamente — tem de ficar fora do try/catch.
  redirect("/conta");
}
