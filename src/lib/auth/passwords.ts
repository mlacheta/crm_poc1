import { randomInt } from "node:crypto";

// Sin caracteres ambiguos (0/O, 1/l/I) porque la contraseña inicial se dicta o se copia a mano.
const ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Contraseña inicial aleatoria (PRD §4.7): el usuario debe cambiarla en su primer ingreso. */
export function generateInitialPassword(length = 12): string {
  return Array.from({ length }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
}
