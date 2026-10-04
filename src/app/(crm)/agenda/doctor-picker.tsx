"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { NativeSelect } from "@/components/native-select";

export function DoctorPicker({ doctors, current }: { doctors: { value: string; label: string }[]; current: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <NativeSelect
      aria-label="Médico"
      value={current}
      onChange={(e) => {
        const params = new URLSearchParams(searchParams);
        params.set("medico", e.target.value);
        router.replace(`${pathname}?${params}`);
      }}
    >
      {doctors.map((d) => (
        <option key={d.value} value={d.value}>
          {d.label}
        </option>
      ))}
    </NativeSelect>
  );
}
