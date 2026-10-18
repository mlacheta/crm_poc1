// Prueba de humo de la demo publicada (Vercel). Lee la contraseña de .env.demo y no la imprime.
// Sólo escribe en el Simulador y al final borra esos datos de prueba.
// Uso: node qa/e2e/smoke-demo.mjs   (o E2E_BASE_URL=https://otra-url node qa/e2e/smoke-demo.mjs)
import { readFileSync } from "node:fs";
import { parse } from "dotenv";

process.env.E2E_BASE_URL ??= "https://crm-poc1.vercel.app";
const { BASE, login, logout, startSuite } = await import("./lib.mjs");
const password = parse(readFileSync(".env.demo")).SEED_USER_PASSWORD;

const { page, check, finish } = await startSuite(`Demo publicada — ${BASE}`);
try {
  await login(page, "admin@lucia.local", "lucia1234");
  await page.waitForSelector("text=Email o contraseña incorrectos.");
  check("la contraseña por defecto no funciona", true);

  await login(page, "admin@lucia.local", password);
  await page.waitForURL("**/pipeline");
  check("pipeline de la clínica demo con 14 pacientes", (await page.locator("article").count()) === 14);
  for (const [path, text] of [
    ["/inbox", "Graciela Suárez"],
    ["/agenda", "Agenda ·"],
    ["/marketing?periodo=todo", "Atribución por canal"],
    ["/admin", "Sedes"],
    ["/admin/usuarios", "Usuarios de"],
  ]) {
    await page.goto(BASE + path);
    check(`${path} carga`, await page.waitForSelector(`text=${text}`, { timeout: 15000 }).then(() => true, () => false));
  }

  await page.goto(`${BASE}/simulador`);
  check("LUCIA en modo mock", (await page.locator("text=/Modelo: mock/").count()) === 1);
  await page.click("button:has-text('Nueva conversación')");
  await page.waitForURL(/tel=/);
  await page.locator("form", { has: page.locator('input[value="Hola, quiero sacar un turno"]') }).locator("button").click();
  await page.waitForSelector("text=Tengo estos turnos", { timeout: 30000 });
  check("LUCIA ofrece turnos con sede", (await page.locator("text=/hs con .+ en (Palermo|Belgrano)/").count()) > 0);
  await page.goto(`${BASE}/simulador`);
  await page.click("button:has-text('Borrar todos los datos de prueba')");
  await page.waitForSelector("text=Todavía no hay conversaciones");
  check("datos de prueba borrados", true);
  await logout(page);

  await login(page, "martin.rossi@lucia.local", password);
  await page.waitForURL("**/login/clinica");
  check("el Dr. Rossi elige entre sus dos clínicas", (await page.locator("button", { hasText: "Visión Sur" }).count()) === 1);
  await page.click("button:has-text('Centro Oftalmológico Demo')");
  await page.waitForURL("**/agenda");
  await logout(page);

  await login(page, "plataforma@lucia.local", password);
  await page.waitForURL("**/plataforma");
  const panel = await page.locator("main").innerText();
  check("panel de plataforma con las dos clínicas, sin pacientes", panel.includes("Visión Sur") && !panel.includes("Sofía"));
  await logout(page);

  await page.goto(`${BASE}/c/vision-sur/equipo`);
  check("link de ingreso de Visión Sur", (await page.locator("text=Visión Sur").count()) > 0);
  process.exit((await finish()) ? 0 : 1);
} catch (e) {
  process.exit((await finish(e)) ? 0 : 1);
}
