"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { NativeSelect } from "@/components/native-select";

/** Selector que guarda su valor en un parámetro de la URL (filtros de médico, sede, canal…). */
export function ParamPicker({
  param,
  label,
  options,
  current,
  allLabel,
}: {
  param: string;
  label: string;
  options: { value: string; label: string }[];
  current: string;
  /** Si se indica, agrega la opción "todos" (valor vacío). */
  allLabel?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <NativeSelect
      aria-label={label}
      value={current}
      onChange={(e) => {
        const params = new URLSearchParams(searchParams);
        if (e.target.value) params.set(param, e.target.value);
        else params.delete(param);
        router.replace(`${pathname}?${params}`);
      }}
    >
      {allLabel && <option value="">{allLabel}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </NativeSelect>
  );
}
