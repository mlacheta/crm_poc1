// Verifica las reglas del motor de agenda y de las herramientas de LUCIA que no se pueden provocar desde la UI
// (carrera de reservas, rango máximo, anticipación mínima, reserva vencida). Casos TEC-01 a TEC-06 de qa/manual_tests.md.
// Uso: npm run qa:agenda   (necesita la base con el seed; limpia lo que crea)
import "dotenv/config";
import { createLuciaTools } from "../src/lib/agent/tools";
import { addDays, addMinutes, arToday } from "../src/lib/dates";
import { prisma } from "../src/lib/prisma";
import { findAvailableSlots, holdSlot, MAX_RANGE_DAYS, MIN_LEAD_MINUTES } from "../src/lib/scheduling";

let failed = 0;
function check(name: string, ok: boolean, detail = "") {
  if (!ok) failed++;
  console.log(`${ok ? "✅" : "❌"} ${name}${detail ? ` · ${detail}` : ""}`);
}

async function main() {
  const clinic = await prisma.clinic.findUniqueOrThrow({ where: { slug: "centro-demo" } });
  const other = await prisma.clinic.findUniqueOrThrow({ where: { slug: "vision-sur" } });
  const [p1, p2] = await prisma.patient.findMany({ where: { clinicId: clinic.id }, orderBy: { createdAt: "asc" }, take: 2 });
  const touched = [p1.id, p2.id];
  const clean = () => prisma.appointment.deleteMany({ where: { patientId: { in: touched }, reason: "qa-motor-agenda" } });
  await clean();

  const now = new Date();
  const slots = await findAvailableSlots({ clinicId: clinic.id, now });
  if (slots.length < 2) throw new Error("No hay turnos libres para probar: corré npm run db:seed.");
  const hold = (patientId: string, s: (typeof slots)[number], at = now) =>
    holdSlot({ clinicId: clinic.id, patientId, doctorId: s.doctorId, start: s.start, reason: "qa-motor-agenda", now: at });

  // TEC-01 · rango máximo
  const far = await findAvailableSlots({ clinicId: clinic.id, fromYmd: arToday(now), toYmd: addDays(arToday(now), 40), now });
  const last = far.map((s) => arToday(s.start)).sort().at(-1) ?? "";
  const limit = addDays(arToday(now), MAX_RANGE_DAYS - 1);
  check(`TEC-01 rango acotado a ${MAX_RANGE_DAYS} días`, far.length > 0 && last <= limit, `último turno ${last}, límite ${limit}`);

  // TEC-02 · anticipación mínima
  const first = slots[0];
  const fakeNow = addMinutes(first.start, -(MIN_LEAD_MINUTES / 2));
  const soon = await findAvailableSlots({ clinicId: clinic.id, now: fakeNow, fromYmd: arToday(first.start) });
  const tooClose = soon.filter((s) => s.start.getTime() < addMinutes(fakeNow, MIN_LEAD_MINUTES).getTime());
  check(`TEC-02 no se ofrecen turnos con menos de ${MIN_LEAD_MINUTES} min de anticipación`, tooClose.length === 0, `${tooClose.length} turnos demasiado cercanos`);

  // TEC-03 · carrera: dos pacientes piden el mismo turno a la vez
  // Una excepción cuenta como falla: el motor debe devolver SLOT_NOT_AVAILABLE, no lanzar.
  const safe = (p: ReturnType<typeof hold>) => p.catch((e: unknown) => ({ ok: false as const, error: `EXCEPCIÓN ${e instanceof Error ? e.name : e}` }));
  const [a, b] = await Promise.all([safe(hold(p1.id, first)), safe(hold(p2.id, first))]);
  check("TEC-03 carrera: sólo uno obtiene el turno", [a, b].filter((r) => r.ok).length === 1, JSON.stringify([a, b].map((r) => (r.ok ? "ok" : r.error))));
  const loser = a.ok ? b : a;
  check("TEC-03 el perdedor recibe SLOT_NOT_AVAILABLE", !loser.ok && loser.error === "SLOT_NOT_AVAILABLE");
  await clean();

  // TEC-04 · una reserva nueva libera la anterior del mismo paciente
  const r1 = await hold(p1.id, slots[0]);
  const r2 = await hold(p1.id, slots[1]);
  const held = await prisma.appointment.findMany({ where: { patientId: p1.id, reason: "qa-motor-agenda" }, orderBy: { createdAt: "asc" } });
  check("TEC-04 la reserva anterior queda CANCELLED", r1.ok && r2.ok && held[0]?.status === "CANCELLED" && held[1]?.status === "TENTATIVE_LOCKED", held.map((h) => h.status).join(" → "));
  await clean();

  // TEC-05 · pago de una reserva inexistente o vencida
  const conv = await prisma.conversation.findFirstOrThrow({ where: { patient: { clinicId: clinic.id } } });
  const tools = createLuciaTools({ clinicId: clinic.id, patientId: p1.id, conversationId: conv.id, now });
  const pay = (appointmentId: string) =>
    (tools.generate_mercadopago_payment as unknown as { execute: (i: { appointmentId: string }, o: object) => Promise<{ ok: boolean; error?: string }> }).execute({ appointmentId }, {});
  const none = await pay("00000000-0000-0000-0000-000000000000");
  check("TEC-05 pago de reserva inexistente rechazado", !none.ok, none.error);
  const h = await hold(p1.id, slots[0]);
  if (!h.ok) throw new Error("No se pudo reservar para TEC-05.");
  await prisma.appointment.update({ where: { id: h.appointmentId }, data: { lockedUntil: addMinutes(now, -1) } });
  const expired = await pay(h.appointmentId);
  check("TEC-05 pago de reserva vencida rechazado", !expired.ok, expired.error);
  await clean();

  // TEC-06 · médico de otra clínica
  const foreign = await prisma.doctorProfile.findFirstOrThrow({ where: { clinicId: other.id } });
  const x = await holdSlot({ clinicId: clinic.id, patientId: p1.id, doctorId: foreign.id, start: first.start, reason: "qa-motor-agenda", now });
  check("TEC-06 médico de otra clínica → DOCTOR_NOT_FOUND", !x.ok && x.error === "DOCTOR_NOT_FOUND");
  await clean();

  console.log(failed ? `\n${failed} verificación(es) fallida(s).` : "\nTodo OK.");
  process.exitCode = failed ? 1 : 0;
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
