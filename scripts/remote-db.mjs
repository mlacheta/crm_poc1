// Prepara una base remota (ej. Neon para la demo) usando las variables de .env.demo.
// Uso:  npm run demo:db            → aplica migraciones
//       npm run demo:db -- --seed  → migraciones + datos demo (BORRA todo lo que haya en esa base)
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { parse } from "dotenv";

const FILE = ".env.demo";
if (!existsSync(FILE)) {
  console.error(`Falta ${FILE}. Copiá .env.demo.example a ${FILE} y completalo.`);
  process.exit(1);
}
const vars = parse(readFileSync(FILE));
for (const key of ["DATABASE_URL", "SEED_USER_PASSWORD"]) {
  if (!vars[key]) {
    console.error(`Falta ${key} en ${FILE}.`);
    process.exit(1);
  }
}
if (/localhost|127\.0\.0\.1/.test(vars.DATABASE_URL)) {
  console.error("DATABASE_URL apunta a localhost: este script es para la base remota.");
  process.exit(1);
}

// Las variables de .env.demo tienen prioridad sobre .env (dotenv no pisa variables ya definidas).
const env = { ...process.env, ...vars };
const run = (cmd) => {
  console.log(`\n> ${cmd}`);
  const r = spawnSync(cmd, { stdio: "inherit", shell: true, env });
  if (r.status !== 0) process.exit(r.status ?? 1);
};

run("npx prisma migrate deploy");
if (process.argv.includes("--seed")) run("npx prisma db seed");
console.log("\nListo.");
