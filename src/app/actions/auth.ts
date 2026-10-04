"use server";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { homeFor } from "@/lib/auth/roles";
import { SESSION_COOKIE, sessionCookieOptions, signSession } from "@/lib/auth/session";

const LoginSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(1),
});

export type LoginState = { error?: string; email?: string } | undefined;

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  const email = String(formData.get("email") ?? "");
  if (!parsed.success) return { error: "Ingresá un email y contraseña válidos.", email };

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  const valid = user?.isActive && (await bcrypt.compare(parsed.data.password, user.passwordHash));
  if (!user || !valid) return { error: "Email o contraseña incorrectos.", email };

  const token = await signSession({ userId: user.id, clinicId: user.clinicId, role: user.role });
  (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions);
  redirect(homeFor(user.role));
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
