// Hito 3: Simulador de LUCIA (modo mock), urgencias, Inbox y aislamiento de datos de prueba.
import { BASE, login, logout, startSuite } from "./lib.mjs";

export default async function run() {
  const { page, check, finish } = await startSuite("Hito 3 — LUCIA y simulador");
  const quick = (text) => page.locator("form", { has: page.locator(`input[name=text][value="${text}"]`) }).locator("button").click();
  const panel = () => page.locator("main aside").innerText();
  try {
    await login(page, "secretaria@lucia.local");
    await page.waitForURL("**/pipeline");
    check("menú muestra Simulador LUCIA", (await page.locator("nav a", { hasText: "Simulador LUCIA" }).count()) === 1);

    await page.goto(`${BASE}/simulador`);
    check("modo mock", (await page.locator("text=/Modelo: mock/").count()) === 1);
    await page.click("button:has-text('Nueva conversación')");
    await page.waitForURL(/tel=/);
    const phone = decodeURIComponent(new URL(page.url()).searchParams.get("tel"));
    await quick("Hola, quiero sacar un turno");
    await page.waitForSelector("text=Tengo estos turnos disponibles");
    check("ofrece turnos reales, con sede", (await page.locator("text=/hs con .+ en (Palermo|Belgrano)/").count()) > 0);
    check("muestra la herramienta check_availability", (await page.locator("summary", { hasText: "check_availability" }).count()) === 1);
    await quick("1");
    await page.waitForSelector("text=Te reservé el turno");
    const p1 = await panel();
    check("panel: Pendiente de pago y reserva tentativa", p1.includes("Pendiente de pago") && p1.includes("Reserva tentativa"));

    await page.goto(`${BASE}/pipeline`);
    check("el paciente de prueba aparece en el Kanban", (await page.locator('section[aria-label="Pendiente de pago"] article', { hasText: phone }).count()) === 1);

    await page.goto(`${BASE}/simulador`);
    await page.click("button:has-text('Nueva conversación')");
    await page.waitForURL(/tel=/);
    const phone2 = decodeURIComponent(new URL(page.url()).searchParams.get("tel"));
    await quick("Veo destellos y como una cortina negra en un ojo");
    await page.waitForSelector("text=acudí a la guardia");
    const p2 = await panel();
    check("urgencia: deriva y pausa a LUCIA", p2.includes("Derivado a humano") && p2.includes("derivada a recepción"));
    await page.fill("textarea[name=text]", "hola? sigue ahí?");
    await page.click("form:has(textarea) button:has-text('Enviar')");
    await page.waitForSelector("text=hola? sigue ahí?");
    await page.waitForTimeout(800);
    check("pausada: LUCIA no responde", (await page.locator("li", { hasText: "LUCIA ·" }).count()) === 1);
    await page.click("main aside button:has-text('Reanudar LUCIA')");
    await page.waitForSelector("main aside >> text=Activa");
    check("reanudar desde el simulador", true);

    await page.goto(`${BASE}/inbox`);
    await page.click(`a:has-text("${phone2}")`);
    await page.waitForSelector("header >> text=Simulador");
    await page.fill("textarea[name=text]", "Hola, soy de recepción");
    await page.click("button:has-text('Enviar')");
    await page.waitForSelector("text=Hola, soy de recepción");
    check("inbox: simulador no intenta enviar a Meta", (await page.locator("text=NO enviado").count()) === 0);

    await page.click('a:has-text("Lucía Romero")');
    await page.waitForSelector("header >> text=+5491140001005");
    await page.fill("textarea[name=text]", "Hola Lucía");
    await page.click("button:has-text('Enviar')");
    await page.waitForSelector("text=/NO enviado por WhatsApp: Falta WHATSAPP_ACCESS_TOKEN/");
    check("inbox: WhatsApp sin token avisa que no se envió", true);

    await logout(page);
    await login(page, "admin@lucia.local");
    await page.waitForURL("**/pipeline");
    await page.goto(`${BASE}/marketing?periodo=todo`);
    check("marketing no muestra el canal Simulador", !(await page.locator("main").innerText()).includes("Simulador"));

    await page.goto(`${BASE}/simulador`);
    await page.click("button:has-text('Borrar todos los datos de prueba')");
    await page.waitForSelector("text=Todavía no hay conversaciones");
    check("borrar datos de prueba", true);
    return finish();
  } catch (e) {
    return finish(e);
  }
}
