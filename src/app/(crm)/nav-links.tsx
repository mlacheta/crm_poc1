"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function NavLinks({ sections }: { sections: { href: string; label: string }[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto md:flex-col">
      {sections.map((s) => {
        const active = pathname === s.href || pathname.startsWith(`${s.href}/`);
        return (
          <Link
            key={s.href}
            href={s.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-md px-3 py-2 text-sm whitespace-nowrap transition-colors",
              active
                ? "bg-sidebar-primary font-medium text-sidebar-primary-foreground"
                : "hover:bg-sidebar-accent",
            )}
          >
            {s.label}
          </Link>
        );
      })}
    </nav>
  );
}
