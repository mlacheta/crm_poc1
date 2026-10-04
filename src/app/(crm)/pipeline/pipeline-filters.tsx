"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { NativeSelect } from "@/components/native-select";

type Option = { value: string; label: string };

export function PipelineFilters({
  doctors,
  channels,
  current,
}: {
  doctors: Option[];
  channels: Option[];
  current: { medico: string; canal: string };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    router.replace(`${pathname}?${params}`);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <NativeSelect aria-label="Filtrar por médico" value={current.medico} onChange={(e) => update("medico", e.target.value)}>
        <option value="">Todos los médicos</option>
        {doctors.map((d) => (
          <option key={d.value} value={d.value}>
            {d.label}
          </option>
        ))}
      </NativeSelect>
      <NativeSelect aria-label="Filtrar por canal" value={current.canal} onChange={(e) => update("canal", e.target.value)}>
        <option value="">Todos los canales</option>
        {channels.map((c) => (
          <option key={c.value} value={c.value}>
            {c.label}
          </option>
        ))}
      </NativeSelect>
    </div>
  );
}
