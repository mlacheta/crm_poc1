import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireUser } from "@/lib/auth/dal";
import { addDays, arDateTime, arToday } from "@/lib/dates";
import { formatARS, formatPct } from "@/lib/format";
import { utmLabel } from "@/lib/pipeline";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

const PERIODS = [
  { value: "7", label: "7 días" },
  { value: "30", label: "30 días" },
  { value: "90", label: "90 días" },
  { value: "todo", label: "Todo" },
];

type Funnel = { leads: number; booked: number; paid: number; attended: number; revenue: number };
const emptyFunnel = (): Funnel => ({ leads: 0, booked: 0, paid: 0, attended: 0, revenue: 0 });

export default async function MarketingPage({ searchParams }: PageProps<"/marketing">) {
  const user = await requireUser(["ADMIN", "MARKETING"]);
  const { periodo } = await searchParams;
  const period = PERIODS.find((p) => p.value === periodo)?.value ?? "30";
  // Desde las 00:00 (hora AR) de hace N días
  const since = period === "todo" ? undefined : arDateTime(addDays(arToday(), -Number(period)));

  // Sólo se seleccionan campos agregables: Marketing no accede a nombres ni diagnósticos (spec 02 §4.2).
  const leads = await prisma.patient.findMany({
    where: { clinicId: user.clinicId, ...(since && { createdAt: { gte: since } }) },
    select: {
      utmSource: true,
      appointments: { select: { status: true, payment: { select: { status: true, amount: true } } } },
    },
  });

  const total = emptyFunnel();
  const byChannel = new Map<string, Funnel>();
  for (const lead of leads) {
    const key = lead.utmSource ?? "";
    const row = byChannel.get(key) ?? emptyFunnel();
    byChannel.set(key, row);

    const approved = lead.appointments.filter((a) => a.payment?.status === "APPROVED");
    const revenue = approved.reduce((sum, a) => sum + Number(a.payment!.amount), 0);
    const flags = {
      leads: 1,
      booked: lead.appointments.length > 0 ? 1 : 0,
      paid: approved.length > 0 ? 1 : 0,
      attended: lead.appointments.some((a) => a.status === "COMPLETED") ? 1 : 0,
      revenue,
    };
    for (const target of [row, total]) {
      for (const k of Object.keys(flags) as (keyof Funnel)[]) target[k] += flags[k];
    }
  }

  const channels = [...byChannel.entries()].sort((a, b) => b[1].leads - a[1].leads);
  const funnelSteps = [
    { label: "Leads entrantes", value: total.leads },
    { label: "Turno reservado", value: total.booked },
    { label: "Pago completado", value: total.paid },
    { label: "Asistencia efectiva", value: total.attended },
  ];
  const kpis = [
    { label: "Leads", value: String(total.leads) },
    { label: "Conversión a turno", value: formatPct(total.booked / total.leads) },
    { label: "Conversión a pago", value: formatPct(total.paid / total.leads) },
    { label: "Facturación cobrada", value: formatARS(total.revenue) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Marketing y adquisición</h1>
          <p className="text-sm text-muted-foreground">Leads ingresados en el período, con su avance en el embudo.</p>
        </div>
        <nav aria-label="Período" className="flex gap-1">
          {PERIODS.map((p) => (
            <Link
              key={p.value}
              href={`/marketing?periodo=${p.value}`}
              aria-current={p.value === period ? "page" : undefined}
              className={buttonVariants({ variant: p.value === period ? "default" : "outline", size: "sm" })}
            >
              {p.label}
            </Link>
          ))}
        </nav>
      </div>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardHeader>
              <CardDescription>{k.label}</CardDescription>
              <CardTitle className="text-2xl tabular-nums">{k.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Embudo de conversión</CardTitle>
          <CardDescription>Pacientes que alcanzaron cada etapa · % sobre leads</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3">
            {funnelSteps.map((s) => {
              const share = total.leads ? s.value / total.leads : 0;
              return (
                <li key={s.label} className="grid grid-cols-[9rem_1fr] items-center gap-3 text-sm sm:grid-cols-[11rem_1fr]">
                  <span className="text-muted-foreground">{s.label}</span>
                  <div className="flex items-center gap-2" title={`${s.label}: ${s.value} (${formatPct(share)})`}>
                    <div className="h-5 flex-1">
                      <div
                        className={cn("h-full rounded-r bg-primary", share === 0 && "hidden")}
                        style={{ width: `${Math.max(share * 100, 1)}%` }}
                      />
                    </div>
                    <span className="w-20 shrink-0 text-right tabular-nums">
                      {s.value} · {formatPct(share)}
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Atribución por canal</CardTitle>
          <CardDescription>Origen UTM del lead: Meta Ads, Google Ads u orgánico</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Canal</TableHead>
                <TableHead className="text-right">Leads</TableHead>
                <TableHead className="text-right">Turnos</TableHead>
                <TableHead className="text-right">Pagos</TableHead>
                <TableHead className="text-right">Asistieron</TableHead>
                <TableHead className="text-right">Conv. a pago</TableHead>
                <TableHead className="text-right">Facturación</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {channels.map(([source, f]) => (
                <TableRow key={source}>
                  <TableCell>{utmLabel(source || null)}</TableCell>
                  <TableCell className="text-right tabular-nums">{f.leads}</TableCell>
                  <TableCell className="text-right tabular-nums">{f.booked}</TableCell>
                  <TableCell className="text-right tabular-nums">{f.paid}</TableCell>
                  <TableCell className="text-right tabular-nums">{f.attended}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatPct(f.paid / f.leads)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatARS(f.revenue)}</TableCell>
                </TableRow>
              ))}
              {channels.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    Sin leads en el período.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
