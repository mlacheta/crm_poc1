// Conversa con LUCIA desde la terminal usando el mismo motor que el webhook (canal SIMULATOR).
// Uso: npm run chat -- "Hola, quiero un turno" "1"
//      CHAT_PHONE=+5490000000001 npm run chat -- "¿Atienden por OSDE?"
// Cada ejecución sin CHAT_PHONE usa un número de prueba nuevo.
import "dotenv/config";
import { handleInboundMessage } from "../src/lib/agent/engine";
import { llmConfig } from "../src/lib/agent/model";
import type { AgentPayload } from "../src/lib/agent/run";
import { prisma } from "../src/lib/prisma";

async function main() {
  const messages = process.argv.slice(2);
  if (messages.length === 0) {
    console.log('Uso: npm run chat -- "mensaje 1" "mensaje 2" ...');
    return;
  }
  const clinic = await prisma.clinic.findFirstOrThrow();
  const phone = process.env.CHAT_PHONE ?? `+54900${Date.now().toString().slice(-8)}`;
  const { provider, model } = llmConfig();
  console.log(`LUCIA · ${provider}/${model} · paciente ${phone}\n`);

  for (const text of messages) {
    console.log(`👤 ${text}`);
    const outcome = await handleInboundMessage({ clinicId: clinic.id, phoneNumber: phone, text, channel: "SIMULATOR" });
    if (outcome.status !== "REPLIED") {
      console.log(`   (sin respuesta de LUCIA: ${outcome.status})\n`);
      continue;
    }
    const reply = await prisma.message.findFirstOrThrow({
      where: { conversationId: outcome.conversationId, sender: "AI_LUCIA" },
      orderBy: { createdAt: "desc" },
    });
    for (const t of (reply.rawPayload as unknown as AgentPayload).tools) {
      console.log(`   🔧 ${t.tool}(${JSON.stringify(t.input)})`);
    }
    console.log(`🤖 ${reply.text.replace(/\n/g, "\n   ")}\n`);
  }

  const patient = await prisma.patient.findFirstOrThrow({
    where: { clinicId: clinic.id, phoneNumber: phone },
    include: { appointments: { include: { payment: true } } },
  });
  console.log(`Etapa CRM: ${patient.currentStage}`);
  for (const a of patient.appointments) {
    console.log(`Turno: ${a.startDateTime.toISOString()} · ${a.status} · pago ${a.payment?.status ?? "—"}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
