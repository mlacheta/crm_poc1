// Utilidades de las pruebas E2E (playwright-core + Chrome instalado en la máquina).
// Requieren: la app corriendo en E2E_BASE_URL con LLM_PROVIDER=mock, y la base con el seed recién cargado.
import { execFileSync } from "node:child_process";
import { chromium } from "playwright-core";

export const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3123";
export const PASSWORD = process.env.SEED_USER_PASSWORD ?? "lucia1234";

/** Crea el navegador y un registro de resultados con chequeos PASS/FAIL. */
export async function startSuite(name) {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const results = [];
  const jsErrors = [];
  page.on("pageerror", (e) => jsErrors.push(e.message));

  const check = (label, ok, extra = "") => results.push({ ok: !!ok, line: `${ok ? "PASS" : "FAIL"} ${label}${extra ? ` — ${extra}` : ""}` });

  async function finish(error) {
    if (error) check("ejecución", false, String(error.message ?? error).split("\n")[0]);
    check("sin errores JS en el cliente", jsErrors.length === 0, jsErrors.join(" | "));
    console.log(`\n# ${name}`);
    for (const r of results) console.log(r.line);
    await browser.close();
    return results.every((r) => r.ok);
  }

  return { browser, context, page, check, finish };
}

export async function login(page, email, password = PASSWORD, url = "/login") {
  await page.goto(BASE + url);
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click("button[type=submit]");
}

export async function logout(page) {
  await page.click("button:has-text('Cerrar sesión')");
  await page.waitForURL("**/login");
}

/** Consulta de sólo lectura a la base local (docker compose). Devuelve filas como texto separado por "|". */
export function sql(query) {
  return execFileSync("docker", ["compose", "exec", "-T", "postgres", "psql", "-U", "lucia", "-d", "lucia", "-tAc", query], {
    encoding: "utf8",
  }).trim();
}
