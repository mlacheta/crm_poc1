// Recorre las pantallas en modo dev y lista errores/advertencias de consola (hidratación, Base UI…).
// Uso: E2E_BASE_URL=http://localhost:3000 node qa/e2e/console-sweep.mjs
import { BASE, login, logout, startSuite } from "./lib.mjs";

const { page, check, finish } = await startSuite(`Consola en ${BASE}`);
const logs = [];
let where = "";
page.on("console", (m) => ["error", "warning"].includes(m.type()) && logs.push(`[${where}] ${m.type()}: ${m.text().split("\n")[0].slice(0, 160)}`));
const visit = async (path) => {
  where = path;
  await page.goto(BASE + path, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
};
try {
  for (const p of ["/login", "/c/centro-demo/equipo"]) await visit(p);
  await login(page, "admin@lucia.local");
  await page.waitForURL("**/pipeline");
  for (const p of ["/pipeline", "/inbox", "/simulador", "/agenda", "/pacientes", "/marketing", "/admin", "/admin/usuarios", "/admin/sedes/nueva", "/cuenta/clave"]) await visit(p);
  await logout(page);
  await login(page, "plataforma@lucia.local");
  await page.waitForURL("**/plataforma");
  await visit("/plataforma");
  await logout(page);
  await login(page, "martin.rossi@lucia.local");
  await page.waitForURL("**/login/clinica");
  where = "/login/clinica";
  await page.waitForTimeout(800);
  check("sin errores ni advertencias de consola", logs.length === 0, [...new Set(logs)].join(" || "));
  process.exit((await finish()) ? 0 : 1);
} catch (e) {
  process.exit((await finish(e)) ? 0 : 1);
}
