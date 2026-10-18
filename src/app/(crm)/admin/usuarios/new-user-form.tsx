"use client";

import { useActionState } from "react";
import { NativeSelect } from "@/components/native-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "../form-status";
import { createStaffUser } from "./actions";
import { InitialPassword } from "./initial-password";

export function NewUserForm() {
  const [state, action, pending] = useActionState(createStaffUser, undefined);

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-[1fr_1fr_12rem]">
        <Field label="Nombre y apellido">
          <Input name="fullName" required />
        </Field>
        <Field label="Email">
          <Input name="email" type="email" required />
        </Field>
        <Field label="Rol">
          <NativeSelect name="role" defaultValue="SECRETARIA" className="w-full">
            <option value="SECRETARIA">Secretaría</option>
            <option value="MARKETING">Marketing</option>
            <option value="ADMIN">Administración</option>
          </NativeSelect>
        </Field>
      </div>
      <Button type="submit" disabled={pending}>
        Crear usuario
      </Button>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.ok && <InitialPassword message={state.ok} password={state.password} />}
    </form>
  );
}
