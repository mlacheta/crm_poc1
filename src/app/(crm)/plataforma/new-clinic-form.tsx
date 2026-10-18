"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Field } from "../admin/form-status";
import { InitialPassword } from "../admin/usuarios/initial-password";
import { createClinic } from "./actions";

export function NewClinicForm() {
  const [state, action, pending] = useActionState(createClinic, undefined);

  return (
    <form action={action} className="space-y-6">
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-3 font-medium">Clínica</legend>
        <Field label="Nombre">
          <Input name="name" placeholder="Centro Visión Norte" required />
        </Field>
        <Field label="CUIT">
          <Input name="cuit" placeholder="30-12345678-9" required />
        </Field>
        <Field label="Link (slug)">
          <Input name="slug" placeholder="vision-norte" required />
        </Field>
        <Field label="Teléfono">
          <Input name="phone" required />
        </Field>
      </fieldset>
      <Separator />
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-3 font-medium">Primera sede</legend>
        <Field label="Nombre de la sede">
          <Input name="siteName" placeholder="Sede central" required />
        </Field>
        <Field label="Dirección">
          <Input name="siteAddress" required />
        </Field>
      </fieldset>
      <Separator />
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-3 font-medium">Primer administrador</legend>
        <Field label="Nombre y apellido">
          <Input name="adminName" required />
        </Field>
        <Field label="Email">
          <Input name="adminEmail" type="email" required />
        </Field>
      </fieldset>
      <Button type="submit" disabled={pending}>
        Crear clínica
      </Button>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.ok && (
        <InitialPassword
          message={`${state.ok} El administrador ingresa en /c/${state.slug}/equipo.`}
          password={state.password}
        />
      )}
    </form>
  );
}
