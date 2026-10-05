"use client";

import { useEffect, useRef } from "react";

/** Lista de mensajes que se desplaza al final cuando llega uno nuevo. */
export function AutoScrollList({ count, children }: { count: number; children: React.ReactNode }) {
  const ref = useRef<HTMLOListElement>(null);
  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: "smooth" });
  }, [count]);

  return (
    <ol ref={ref} className="flex-1 space-y-2 overflow-y-auto p-3">
      {children}
    </ol>
  );
}
