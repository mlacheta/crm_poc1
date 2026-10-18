// Hito 4: multi-clínica (SaaS) y sedes — criterios de aceptación de la spec 05.
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { parse } from "dotenv";
import { BASE, PASSWORD, login, logout, sql, startSuite } from "./lib.mjs";

const one = (q) => sql(q).split("\n")[0];

async function postWebhook(phoneNumberId, from, text, id) {
  const secret = parse(readFileSync(".env")).WHATSAPP_APP_SECRET;
  const body = JSON.stringify({
    object: "whatsapp_business_account",
    entry: [{ changes: [{ field: "messages", value: { metadata: { phone_number_id: phoneNumberId }, messages: [{ from, id, timestamp: "1", type: "text", text: { body: text } }] } }] }],
  });
  const res = await fetch(`${BASE}/api/webhooks/whatsapp`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Hub-Signature-256": `sha256=${createHmac("sha256", secret).update(body).digest("hex")}` },
    body,
  });
  return res.status;
}

export default async function run() {
  const { browser, page, check, finish } = await startSuite("Hito 4 — Multi-clínica y sedes");
  const demo = one(`select id from "Clinic" where slug='centro-demo'`);
  const sur = one(`select id from "Clinic" where slug='vision-sur'`);
  const jorge = one(`select id from "Patient" where "clinicId"='${demo}' and "firstName"='Jorge'`);
  const camila = one(`select id from "Patient" where "clinicId"='${demo}' and "firstName"='Camila'`);
  const pedro = one(`select id from "Patient" where "clinicId"='${sur}' and "firstName"='Pedro'`);
  const demoConv = one(`select c.id from "Conversation" c join "Patient" p on p.id=c."patientId" where p."clinicId"='${demo}' limit 1`);
  const mendez = one(`select d.id from "DoctorProfile" d join "User" u on u.id=d."userId" where d."clinicId"='${demo}' and u.email='laura.mendez@lucia.local'`);
  const palermo = one(`select id from "Location" where "clinicId"='${demo}' and name='Palermo'`);
  const notFound = async () => (await page.locator("text=/404|could not be found/i").count()) > 0;

  try {
    // 1. Plataforma: ve clínicas y métricas, nunca pacientes
    await login(page, "plataforma@lucia.local");
    await page.waitForURL("**/plataforma");
    const platformText = await page.locator("main").innerText();
    check("plataforma ve las dos clínicas", platformText.includes("Centro Oftalmológico Demo") && platformText.includes("Visión Sur"));
    check("plataforma no ve nombres de pacientes", !platformText.includes("Sofía") && !platformText.includes("Fernández"));
    await page.goto(`${BASE}/pacientes/${jorge}`);
    check("plataforma no puede abrir una ficha de paciente", page.url().endsWith("/plataforma"));
    await page.goto(`${BASE}/inbox/${demoConv}`);
    check("plataforma no puede abrir conversaciones", page.url().endsWith("/plataforma"));
    await logout(page);

    // 2. Médico con cuenta en dos clínicas: elige a cuál entrar
    await login(page, "martin.rossi@lucia.local");
    await page.waitForURL("**/login/clinica");
    const choices = await page.locator("main").innerText();
    check("médico en dos clínicas elige clínica", choices.includes("Centro Oftalmológico Demo") && choices.includes("Visión Sur"));
    await page.click("button:has-text('Visión Sur')");
    await page.waitForURL("**/agenda");
    await page.goto(`${BASE}/pacientes`);
    const surPatients = await page.locator("main").innerText();
    check("en Visión Sur ve sólo sus pacientes", surPatients.includes("Gómez") && !surPatients.includes("Fernández") && !surPatients.includes("Herrera"));
    await logout(page);

    // 3. Link de la clínica: entra directo, sin elegir
    await login(page, "martin.rossi@lucia.local", PASSWORD, "/c/centro-demo/equipo");
    await page.waitForURL("**/agenda");
    await page.goto(`${BASE}/pacientes`);
    const demoPatients = await page.locator("main").innerText();
    check("link /c/<slug>/equipo entra directo a esa clínica", demoPatients.includes("Fernández") && demoPatients.includes("Herrera"));
    await logout(page);

    // 4. Acceso cruzado por URL
    await login(page, "admin@visionsur.local");
    await page.waitForURL("**/pipeline");
    check("pipeline de Visión Sur sólo con sus 3 pacientes", (await page.locator("article").count()) === 3);
    for (const [label, path] of [
      ["ficha de paciente", `/pacientes/${jorge}`],
      ["conversación", `/inbox/${demoConv}`],
      ["médico", `/admin/medicos/${mendez}`],
      ["sede", `/admin/sedes/${palermo}`],
    ]) {
      await page.goto(BASE + path);
      check(`acceso cruzado por URL a ${label} de otra clínica → no encontrado`, await notFound());
    }

    // 5. Acceso cruzado por server action: se altera el pedido para apuntar a un paciente de la otra clínica
    const camilaStage = one(`select "currentStage" from "Patient" where id='${camila}'`);
    await page.goto(`${BASE}/pipeline`);
    await page.route("**/pipeline**", (route) => {
      const body = route.request().postData();
      if (route.request().method() === "POST" && body?.includes(pedro)) return route.continue({ postData: body.replaceAll(pedro, camila) });
      return route.continue();
    });
    const card = page.locator("article", { hasText: "Pedro Sosa" });
    const target = page.locator('section[aria-label="Turno confirmado"]');
    const from = await card.boundingBox();
    const to = await target.boundingBox();
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(from.x + 40, from.y + from.height / 2, { steps: 5 });
    await page.mouse.move(to.x + to.width / 2, to.y + 60, { steps: 20 });
    await page.mouse.up();
    await page.waitForTimeout(2000);
    await page.unroute("**/pipeline**");
    check("server action con id de otra clínica no modifica nada", one(`select "currentStage" from "Patient" where id='${camila}'`) === camilaStage);

    // 6. Suspensión: corta la sesión abierta, bloquea el ingreso y LUCIA no responde
    const platform = await (await browser.newContext()).newPage();
    await login(platform, "plataforma@lucia.local");
    await platform.waitForURL("**/plataforma");
    await platform.locator("tr", { hasText: "Visión Sur" }).locator("button:has-text('Suspender')").click();
    await platform.waitForSelector("tr:has-text('Visión Sur') >> text=Suspendida");
    await page.goto(`${BASE}/pipeline`);
    check("suspender corta la sesión abierta de la clínica", page.url().endsWith("/login"));
    await login(page, "admin@visionsur.local");
    await page.waitForSelector("text=Email o contraseña incorrectos.");
    check("clínica suspendida no permite ingresar", true);
    await page.goto(`${BASE}/c/vision-sur/equipo`);
    check("el link de la clínica avisa la suspensión", (await page.locator("text=/suspendido/").count()) > 0);
    const status = await postWebhook("100000000000002", "5491150002001", "Hola, ¿están?", `wamid.SUSP${Date.now()}`);
    await page.waitForTimeout(2500);
    const lastSender = one(`select m.sender from "Message" m join "Conversation" c on c.id=m."conversationId" join "Patient" p on p.id=c."patientId" where p."clinicId"='${sur}' and p."phoneNumber"='+5491150002001' order by m."createdAt" desc limit 1`);
    check("clínica suspendida: el mensaje se registra y LUCIA no responde", status === 200 && lastSender === "PATIENT", `${status}/${lastSender}`);
    await platform.locator("tr", { hasText: "Visión Sur" }).locator("button:has-text('Reactivar')").click();
    await platform.waitForSelector("tr:has-text('Visión Sur') >> text=Activa");

    // 7. Alta de clínica por la plataforma y primer ingreso de su administrador
    await platform.fill("input[name=name]", "Visión Norte");
    await platform.fill("input[name=cuit]", "30-71111222-3");
    await platform.fill("input[name=slug]", "vision-norte");
    await platform.fill("input[name=phone]", "+541148887777");
    await platform.fill("input[name=siteName]", "Sede central");
    await platform.fill("input[name=siteAddress]", "Av. Maipú 1000, Vicente López");
    await platform.fill("input[name=adminName]", "Admin Norte");
    await platform.fill("input[name=adminEmail]", "admin@visionnorte.local");
    await platform.click("button:has-text('Crear clínica')");
    const initial = await platform.locator("code").innerText({ timeout: 15000 });
    check("alta de clínica muestra la contraseña inicial", initial.length >= 12);
    await platform.close();

    // La sesión del admin de Visión Sur vuelve a ser válida al reactivar la clínica: se descarta para el siguiente ingreso.
    await page.context().clearCookies();
    await login(page, "admin@visionnorte.local", initial, "/c/vision-norte/equipo");
    await page.waitForURL("**/cuenta/clave");
    check("primer ingreso exige cambiar la contraseña", true);
    await page.goto(`${BASE}/pipeline`);
    check("sin cambiar la contraseña no accede al CRM", page.url().endsWith("/cuenta/clave"));
    await page.fill("#current", initial);
    await page.fill("#next", "NuevaClave2026");
    await page.fill("#confirm", "NuevaClave2026");
    await page.click("button:has-text('Guardar contraseña')");
    await page.waitForURL("**/pipeline");
    check("tras cambiarla entra a su clínica vacía", (await page.locator("article").count()) === 0);
    await page.goto(`${BASE}/admin`);
    check("la clínica nueva tiene su primera sede", (await page.locator("text=Sede central").count()) > 0);
    await logout(page);

    // 8. Usuarios de la clínica
    await login(page, "admin@lucia.local");
    await page.waitForURL("**/pipeline");
    await page.goto(`${BASE}/admin/usuarios`);
    await page.fill("input[name=fullName]", "Secretaria Dos");
    await page.fill("input[name=email]", "secretaria2@lucia.local");
    await page.click("button:has-text('Crear usuario')");
    const staffPassword = await page.locator("code").innerText();
    check("admin crea un usuario con contraseña inicial", staffPassword.length >= 12);
    const self = await page.locator("tr", { hasText: "admin@lucia.local" }).innerText();
    check("el admin no puede desactivarse a sí mismo", self.includes("Tu usuario"));

    // 9. Sedes: alta, superposición de horarios y desactivación
    await page.goto(`${BASE}/admin/sedes/nueva`);
    await page.fill("input[name=name]", "Caballito");
    await page.fill("input[name=address]", "Av. Rivadavia 5000, CABA");
    await page.click("button:has-text('Crear sede')");
    await page.waitForURL("**/admin");
    check("alta de sede", (await page.locator("tr", { hasText: "Caballito" }).count()) === 1);
    await page.goto(`${BASE}/admin/medicos/${mendez}`);
    check("el formulario del médico muestra un horario por sede", (await page.locator("legend", { hasText: "Horario en" }).count()) === 3);
    await page.locator("fieldset", { hasText: "Horario en Palermo" }).locator(`input[name$="-day-2-active"]`).check();
    await page.click("button:has-text('Guardar cambios')");
    await page.waitForSelector("text=/se superpone/");
    check("horarios superpuestos en dos sedes se rechazan", true);
    await page.goto(`${BASE}/admin/sedes/${palermo}`);
    await page.locator("input[name=isActive]").uncheck();
    await page.click("button:has-text('Guardar cambios')");
    await page.waitForSelector("text=/turno\\(s\\) futuro/");
    check("no se desactiva una sede con turnos futuros", true);

    // 10. Filtros por sede
    const valentinaDay = one(`select to_char(a."startDateTime" at time zone 'America/Argentina/Buenos_Aires','YYYY-MM-DD') from "Appointment" a join "Patient" p on p.id=a."patientId" where p."firstName"='Valentina'`);
    await page.goto(`${BASE}/agenda?medico=${mendez}&fecha=${valentinaDay}`);
    check("la agenda muestra la sede del turno", (await page.locator("tr", { hasText: "Valentina" }).innerText()).includes("Belgrano"));
    await page.goto(`${BASE}/agenda?medico=${mendez}&fecha=${valentinaDay}&sede=${palermo}`);
    check("filtrar la agenda por otra sede lo oculta", (await page.locator("text=No hay turnos para este día.").count()) === 1);
    const belgrano = one(`select id from "Location" where "clinicId"='${demo}' and name='Belgrano'`);
    await page.goto(`${BASE}/pipeline?sede=${belgrano}`);
    const byBelgrano = await page.locator("main").innerText();
    check("pipeline filtrado por sede", byBelgrano.includes("Valentina López") && !byBelgrano.includes("Sofía Gómez"));
    return finish();
  } catch (e) {
    return finish(e);
  }
}
