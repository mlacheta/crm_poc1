import type { FormState } from "./actions";

export function FormStatus({ state }: { state: FormState }) {
  if (state?.error) return <p className="text-sm text-destructive">{state.error}</p>;
  if (state?.ok) return <p className="text-sm text-muted-foreground">{state.ok}</p>;
  return null;
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5 text-sm">
      <span className="font-medium">{label}</span>
      {children}
    </label>
  );
}
