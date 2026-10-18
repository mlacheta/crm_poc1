"use client";

import { useState, useTransition } from "react";
import type { Role } from "@/generated/prisma/enums";
import { NativeSelect } from "@/components/native-select";
import { Button } from "@/components/ui/button";
import { changeUserRole, resetUserPassword, setUserActive, type UserFormState } from "./actions";
import { InitialPassword } from "./initial-password";

type Row = { id: string; fullName: string; role: Role; isActive: boolean };

export function UserActions({ user, isSelf }: { user: Row; isSelf: boolean }) {
  const [result, setResult] = useState<UserFormState>();
  const [pending, startTransition] = useTransition();
  const run = (fn: () => Promise<UserFormState>) => startTransition(async () => setResult(await fn()));

  if (isSelf) return <span className="text-xs text-muted-foreground">Tu usuario</span>;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {user.role !== "MEDICO" && user.isActive && (
          <form action={(fd) => run(() => changeUserRole(user.id, fd))} className="flex items-center gap-1">
            <NativeSelect name="role" defaultValue={user.role} aria-label={`Rol de ${user.fullName}`}>
              <option value="SECRETARIA">Secretaría</option>
              <option value="MARKETING">Marketing</option>
              <option value="ADMIN">Administración</option>
            </NativeSelect>
            <Button type="submit" size="sm" variant="outline" disabled={pending}>
              Cambiar rol
            </Button>
          </form>
        )}
        {user.isActive && (
          <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => resetUserPassword(user.id))}>
            Restablecer contraseña
          </Button>
        )}
        <Button
          size="sm"
          variant={user.isActive ? "destructive" : "outline"}
          disabled={pending}
          onClick={() => run(() => setUserActive(user.id, !user.isActive))}
        >
          {user.isActive ? "Desactivar" : "Reactivar"}
        </Button>
      </div>
      {result?.error && <p className="text-sm text-destructive">{result.error}</p>}
      {result?.ok && <InitialPassword message={result.ok} password={result.password} />}
    </div>
  );
}
