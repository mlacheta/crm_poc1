// Sesión stateless: JWT firmado (HS256) en una cookie httpOnly.
// Sin "server-only" porque también lo usa proxy.ts para el chequeo optimista.
import { jwtVerify, SignJWT } from "jose";
import type { Role } from "@/generated/prisma/enums";

export const SESSION_COOKIE = "lucia_session";
const SESSION_TTL_SECONDS = 60 * 60 * 12; // una jornada laboral

export type SessionPayload = {
  userId: string;
  clinicId: string | null; // null sólo para PLATFORM_ADMIN
  role: Role;
};

/** Token de corta duración del paso "elegí la clínica" (PRD §4.7): las cuentas cuya contraseña ya coincidió. */
export const CLINIC_CHOICE_COOKIE = "lucia_clinic_choice";
const CHOICE_TTL_SECONDS = 5 * 60;

function secretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET no está definido o tiene menos de 32 caracteres.");
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload, typ: "session" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secretKey());
}

export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify<SessionPayload & { typ?: string }>(token, secretKey(), { algorithms: ["HS256"] });
    if (payload.typ !== "session") return null;
    return { userId: payload.userId, clinicId: payload.clinicId ?? null, role: payload.role };
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_TTL_SECONDS,
};

export async function signClinicChoice(userIds: string[]): Promise<string> {
  return new SignJWT({ typ: "clinic-choice", userIds })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${CHOICE_TTL_SECONDS}s`)
    .sign(secretKey());
}

export async function verifyClinicChoice(token: string | undefined): Promise<string[] | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify<{ typ?: string; userIds?: string[] }>(token, secretKey(), { algorithms: ["HS256"] });
    return payload.typ === "clinic-choice" && Array.isArray(payload.userIds) ? payload.userIds : null;
  } catch {
    return null;
  }
}

export const clinicChoiceCookieOptions = { ...sessionCookieOptions, maxAge: CHOICE_TTL_SECONDS };
