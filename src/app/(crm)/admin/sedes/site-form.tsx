"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { FormState } from "../actions";
import { Field, FormStatus } from "../form-status";

export type SiteFormValues = { name: string; address: string; phone: string; isActive: boolean };

export function SiteForm({
  action: serverAction,
  values,
  isNew = false,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  values: SiteFormValues;
  isNew?: boolean;
}) {
  const [state, action, pending] = useActionState(serverAction, undefined);

  return (
    <form action={action} className="space-y-6">
      {/* Al cambiar los valores guardados se remontan los campos: Base UI no admite cambiar defaultValue. */}
      <div key={JSON.stringify(values)} className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre">
          <Input name="name" defaultValue={values.name} placeholder="Palermo" required />
        </Field>
        <Field label="Teléfono">
          <Input name="phone" defaultValue={values.phone} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Dirección">
            <Input name="address" defaultValue={values.address} placeholder="Av. Santa Fe 1234, CABA" required />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" name="isActive" defaultChecked={values.isActive} className="size-4" />
          Sede activa (sus horarios se ofrecen para sacar turno)
        </label>
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {isNew ? "Crear sede" : "Guardar cambios"}
        </Button>
        <FormStatus state={state} />
      </div>
    </form>
  );
}
