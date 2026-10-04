import { logout } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/dal";
import { ROLE_LABELS, sectionsFor } from "@/lib/auth/roles";
import { NavLinks } from "./nav-links";

export default async function CrmLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="flex min-h-full flex-1 flex-col md:flex-row">
      <aside className="flex shrink-0 flex-col gap-4 border-b bg-muted/40 p-4 md:w-56 md:border-r md:border-b-0">
        <div>
          <p className="font-semibold">LUCIA CRM</p>
          <p className="text-xs text-muted-foreground">
            {user.fullName} · {ROLE_LABELS[user.role]}
          </p>
        </div>
        <NavLinks sections={sectionsFor(user.role).map(({ href, label }) => ({ href, label }))} />
        <form action={logout} className="md:mt-auto">
          <Button type="submit" variant="ghost" size="sm" className="w-full justify-start">
            Cerrar sesión
          </Button>
        </form>
      </aside>
      <main className="min-w-0 flex-1 p-4 md:p-6">{children}</main>
    </div>
  );
}
