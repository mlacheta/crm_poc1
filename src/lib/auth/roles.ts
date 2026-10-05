import type { Role } from "@/generated/prisma/enums";

// Matriz de acceso por sección (spec 02 §4). Fuente única para proxy, DAL y navegación.
export const SECTIONS = [
  { href: "/pipeline", label: "Pipeline", roles: ["ADMIN", "SECRETARIA"] },
  { href: "/inbox", label: "Inbox WhatsApp", roles: ["ADMIN", "SECRETARIA"] },
  { href: "/simulador", label: "Simulador LUCIA", roles: ["ADMIN", "SECRETARIA"] },
  { href: "/agenda", label: "Agenda", roles: ["ADMIN", "MEDICO"] },
  { href: "/pacientes", label: "Pacientes", roles: ["ADMIN", "MEDICO"] },
  { href: "/marketing", label: "Marketing", roles: ["ADMIN", "MARKETING"] },
  { href: "/admin", label: "Configuración", roles: ["ADMIN"] },
] as const satisfies readonly { href: string; label: string; roles: readonly Role[] }[];

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Administración",
  SECRETARIA: "Secretaría",
  MEDICO: "Médico",
  MARKETING: "Marketing",
};

export function sectionsFor(role: Role) {
  return SECTIONS.filter((s) => (s.roles as readonly Role[]).includes(role));
}

export function homeFor(role: Role): string {
  return sectionsFor(role)[0]?.href ?? "/login";
}

/** ¿Puede `role` acceder a `pathname`? Rutas fuera de SECTIONS no se restringen por rol. */
export function canAccessPath(role: Role, pathname: string): boolean {
  const section = SECTIONS.find((s) => pathname === s.href || pathname.startsWith(`${s.href}/`));
  return !section || (section.roles as readonly Role[]).includes(role);
}
