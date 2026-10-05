"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { DAY_NAMES } from "@/lib/format";
import type { FormState } from "./actions";
import { Field, FormStatus } from "./form-status";

export type DoctorFormValues = {
  fullName: string;
  licenseNumber: string;
  specialty: string;
  consultorioNumber: string;
  appointmentDuration: number;
  consultationFee: number;
  schedule: Record<number, { startTime: string; endTime: string } | undefined>;
};

// Lunes primero, domingo al final
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

export function DoctorForm({
  action: serverAction,
  values,
  isNew = false,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  values: DoctorFormValues;
  isNew?: boolean;
}) {
  const [state, action, pending] = useActionState(serverAction, undefined);

  return (
    <form action={action} className="space-y-6">
      {/* Al cambiar los valores guardados se remontan los campos: Base UI no admite cambiar defaultValue. */}
      <div key={JSON.stringify(values)} className="space-y-6">
        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-3 font-medium">Profesional</legend>
          <Field label="Nombre completo">
            <Input name="fullName" defaultValue={values.fullName} placeholder="Dra. Ana Pérez" required />
          </Field>
          <Field label="Matrícula">
            <Input name="licenseNumber" defaultValue={values.licenseNumber} placeholder="MN 123456" required />
          </Field>
          <Field label="Especialidad">
            <Input name="specialty" defaultValue={values.specialty} required />
          </Field>
          <Field label="Consultorio">
            <Input name="consultorioNumber" defaultValue={values.consultorioNumber} />
          </Field>
          <Field label="Duración del turno (min)">
            <Input name="appointmentDuration" type="number" min={5} step={5} defaultValue={values.appointmentDuration} required />
          </Field>
          <Field label="Arancel consulta particular (ARS)">
            <Input name="consultationFee" type="number" min={0} step={500} defaultValue={values.consultationFee} required />
          </Field>
          {isNew && (
            <>
              <Field label="Email de acceso">
                <Input name="email" type="email" required />
              </Field>
              <Field label="Contraseña inicial">
                <Input name="password" type="password" minLength={8} required />
              </Field>
            </>
          )}
        </fieldset>

        <Separator />

        <fieldset className="space-y-2">
          <legend className="mb-3 font-medium">Horario de atención</legend>
          {WEEK_ORDER.map((day) => {
            const slot = values.schedule[day];
            return (
              <div key={day} className="grid grid-cols-[7rem_auto_auto] items-center gap-2 text-sm sm:grid-cols-[8rem_8rem_8rem]">
                <label className="flex items-center gap-2">
                  <input type="checkbox" name={`day-${day}-active`} defaultChecked={!!slot} className="size-4" />
                  {DAY_NAMES[day]}
                </label>
                <Input name={`day-${day}-start`} type="time" defaultValue={slot?.startTime ?? "09:00"} aria-label={`${DAY_NAMES[day]} desde`} />
                <Input name={`day-${day}-end`} type="time" defaultValue={slot?.endTime ?? "13:00"} aria-label={`${DAY_NAMES[day]} hasta`} />
              </div>
            );
          })}
        </fieldset>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {isNew ? "Crear médico" : "Guardar cambios"}
        </Button>
        <FormStatus state={state} />
      </div>
    </form>
  );
}
