// Cifrado del token de negocio de cada clínica (AES-256-GCM). Formato: v1.<iv>.<tag>.<datos> en base64url.
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

function key(): Buffer {
  const secret = process.env.WHATSAPP_TOKEN_ENCRYPTION_KEY || process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("Falta WHATSAPP_TOKEN_ENCRYPTION_KEY (o SESSION_SECRET) de al menos 32 caracteres.");
  return createHash("sha256").update(secret).digest();
}

export function encryptToken(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), data.toString("base64url")].join(".");
}

export function decryptToken(stored: string): string {
  const [version, iv, tag, data] = stored.split(".");
  if (version !== "v1" || !iv || !tag || !data) throw new Error("Token cifrado con formato inválido.");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8");
}
