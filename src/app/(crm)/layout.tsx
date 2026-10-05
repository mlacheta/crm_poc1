import { logout } from "@/app/actions/auth";
import { LuciaLogo } from "@/components/brand/lucia-logo";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/dal";
import { ROLE_LABELS, sectionsFor } from "@/lib/auth/roles";
import { NavLinks } from "./nav-links";

export default async function CrmLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="flex min-h-full flex-1 flex-col md:flex-row">
      <aside className="flex shrink-0 flex-col gap-4 border-b border-sidebar-border bg-sidebar p-4 text-sidebar-foreground md:w-60 md:border-r md:border-b-0">
        <LuciaLogo tagline="CRM oftalmológico" />
        <p className="text-xs text-muted-foreground">
          {user.fullName} · {ROLE_LABELS[user.role]}
        </p>
        <NavLinks sections={sectionsFor(user.role).map(({ href, label }) => ({ href, label }))} />
        <form action={logout} className="md:mt-auto">
          <Button type="submit" variant="ghost" size="sm" className="w-full justify-start hover:bg-sidebar-accent">
            Cerrar sesión
          </Button>
        </form>
      </aside>
      <main className="min-w-0 flex-1 p-4 md:p-6">{children}</main>
    </div>
  );
}
