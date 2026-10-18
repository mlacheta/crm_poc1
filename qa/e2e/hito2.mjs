// Hito 2: login, Kanban, Inbox con pausa de LUCIA, logout y Configuración.
import { BASE, login, logout, startSuite } from "./lib.mjs";

export default async function run() {
  const { page, check, finish } = await startSuite("Hito 2 — CRM y roles");
  try {
    await login(page, "secretaria@lucia.local", "mala");
    await page.waitForSelector("text=Email o contraseña incorrectos.");
    check("login inválido muestra error", true);

    await login(page, "secretaria@lucia.local");
    await page.waitForURL("**/pipeline");
    check("secretaría aterriza en /pipeline", true);

    // Drag & drop: Camila (Conversando) → Pendiente de pago
    const card = page.locator("article", { hasText: "Camila Torres" });
    const target = page.locator('section[aria-label="Pendiente de pago"]');
    const from = await card.boundingBox();
    const to = await target.boundingBox();
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(from.x + from.width / 2 + 20, from.y + from.height / 2, { steps: 5 });
    await page.mouse.move(to.x + to.width / 2, to.y + 60, { steps: 20 });
    await page.mouse.up();
    await page.waitForTimeout(1500);
    await page.reload();
    check("drag & drop persiste la etapa", (await page.locator('section[aria-label="Pendiente de pago"] article', { hasText: "Camila Torres" }).count()) === 1);

    await page.goto(`${BASE}/inbox`);
    await page.click("a:has-text('Lucía Romero')");
    await page.waitForSelector("text=LUCIA activa");
    await page.fill("textarea[name=text]", "Hola Lucía, te escribe Mariana de recepción.");
    await page.click("button:has-text('Enviar')");
    await page.waitForSelector("text=te escribe Mariana de recepción");
    await page.waitForSelector("text=/LUCIA pausada hasta/");
    check("responder como recepción pausa a LUCIA", true);
    await page.click("button:has-text('Reanudar LUCIA')");
    await page.waitForSelector("text=LUCIA activa");
    check("reanudar LUCIA", true);

    await logout(page);
    await page.goto(`${BASE}/pipeline`);
    check("logout invalida la sesión", page.url().endsWith("/login"));

    await login(page, "admin@lucia.local");
    await page.waitForURL("**/pipeline");
    await page.goto(`${BASE}/admin`);
    await page.click("a:has-text('Dr. Martín Rossi')");
    await page.fill("input[name=consultationFee]", "65000");
    await page.click("button:has-text('Guardar cambios')");
    await page.waitForSelector("text=Médico actualizado.");
    await page.goto(`${BASE}/admin`);
    const row = await page.locator("tr", { hasText: "Dr. Martín Rossi" }).innerText();
    check("admin edita arancel", row.includes("65.000"));
    await page.fill("input[name=wabaId]", "WABA-TEST-123");
    await page.click("button:has-text('Guardar configuración')");
    await page.waitForSelector("text=Configuración guardada.");
    check("admin guarda credenciales", true);
    await page.fill("input[name=cuit]", "123");
    await page.click("button:has-text('Guardar configuración')");
    await page.waitForSelector("text=/Formato esperado/");
    check("validación de CUIT", true);
    return finish();
  } catch (e) {
    return finish(e);
  }
}
