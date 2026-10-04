// Sesión stateless: JWT firmado (HS256) en una cookie httpOnly.
// Sin "server-only" porque también lo usa proxy.ts para el chequeo optimista.
import { jwtVerify, SignJWT } from "jose";
import type { Role } from "@/generated/prisma/enums";

export const SESSION_COOKIE = "lucia_session";
const SESSION_TTL_SECONDS = 60 * 60 * 12; // una jornada laboral

export type SessionPayload = {
  userId: string;
  clinicId: string;
  role: Role;
};

function secretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET no está definido o tiene menos de 32 caracteres.");
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secretKey());
}

export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify<SessionPayload>(token, secretKey(), { algorithms: ["HS256"] });
    return { userId: payload.userId, clinicId: payload.clinicId, role: payload.role };
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
