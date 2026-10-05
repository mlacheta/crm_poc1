"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Item = { id: string; name: string; preview: string; lastMessageAt: string; paused: boolean; simulator: boolean };

export function ConversationList({ items }: { items: Item[] }) {
  const { id: activeId } = useParams<{ id?: string }>();

  if (items.length === 0) {
    return <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">Todavía no hay conversaciones.</p>;
  }

  return (
    <ul className="max-h-60 overflow-y-auto rounded-lg border bg-card md:max-h-none">
      {items.map((c) => (
        <li key={c.id} className="border-b last:border-b-0">
          <Link href={`/inbox/${c.id}`} className={cn("block space-y-1 p-3 hover:bg-muted", c.id === activeId && "bg-secondary")}>
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-sm font-medium">{c.name}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{c.lastMessageAt}</span>
            </div>
            <p className="truncate text-xs text-muted-foreground">{c.preview}</p>
            <div className="flex flex-wrap gap-1">
              {c.paused && <Badge variant="destructive">Atención humana</Badge>}
              {c.simulator && <Badge variant="outline">Simulador</Badge>}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
