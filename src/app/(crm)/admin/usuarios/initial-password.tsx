/** Muestra una contraseña inicial una única vez (no se guarda en texto plano en ningún lado). */
export function InitialPassword({ message, password }: { message: string; password?: string }) {
  return (
    <div className="space-y-1 rounded-md border border-success/25 bg-[color-mix(in_srgb,var(--success)_8%,var(--card))] p-3 text-sm">
      <p className="text-success">{message}</p>
      {password && (
        <p>
          Contraseña inicial: <code className="rounded bg-card px-1.5 py-0.5 font-mono text-base">{password}</code>
          <span className="block text-xs text-muted-foreground">
            Copiala ahora: no se vuelve a mostrar. Compartila por un canal privado; se pide cambiarla en el primer ingreso.
          </span>
        </p>
      )}
    </div>
  );
}
