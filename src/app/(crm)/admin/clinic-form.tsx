"use client";

import { useActionState } from "react";
import { NativeSelect } from "@/components/native-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { updateClinic } from "./actions";
import { Field, FormStatus } from "./form-status";

export type ClinicFormValues = {
  name: string;
  cuit: string;
  address: string;
  phone: string;
  whatsappNumberId: string;
  wabaId: string;
  puntoDeVenta: number;
  taxType: string;
  certificatePath: string;
  privateKeyPath: string;
  autoInvoiceOnPay: boolean;
};

export function ClinicForm({ values }: { values: ClinicFormValues }) {
  const [state, action, pending] = useActionState(updateClinic, undefined);

  return (
    <form action={action} className="space-y-6">
      {/* Al cambiar los valores guardados se remontan los campos: Base UI no admite cambiar defaultValue. */}
      <div key={JSON.stringify(values)} className="space-y-6">
        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-3 font-medium">Datos de la clínica</legend>
          <Field label="Nombre">
            <Input name="name" defaultValue={values.name} required />
          </Field>
          <Field label="CUIT">
            <Input name="cuit" defaultValue={values.cuit} placeholder="30-12345678-9" required />
          </Field>
          <Field label="Dirección">
            <Input name="address" defaultValue={values.address} required />
          </Field>
          <Field label="Teléfono">
            <Input name="phone" defaultValue={values.phone} required />
          </Field>
        </fieldset>

        <Separator />

        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-3 font-medium">WhatsApp Cloud API (Meta)</legend>
          <Field label="Phone Number ID">
            <Input name="whatsappNumberId" defaultValue={values.whatsappNumberId} />
          </Field>
          <Field label="WhatsApp Business Account ID (WABA)">
            <Input name="wabaId" defaultValue={values.wabaId} />
          </Field>
        </fieldset>

        <Separator />

        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-3 font-medium">Facturación electrónica ARCA</legend>
          <Field label="Punto de venta">
            <Input name="puntoDeVenta" type="number" min={1} defaultValue={values.puntoDeVenta} required />
          </Field>
          <Field label="Condición fiscal">
            <NativeSelect name="taxType" defaultValue={values.taxType} className="w-full">
              <option value="MONOTRIBUTO">Monotributo (Factura C)</option>
              <option value="RESPONSABLE_INSCRIPTO">Responsable inscripto (Factura B)</option>
            </NativeSelect>
          </Field>
          <Field label="Ruta del certificado (.crt)">
            <Input name="certificatePath" defaultValue={values.certificatePath} required />
          </Field>
          <Field label="Ruta de la clave privada (.key)">
            <Input name="privateKeyPath" defaultValue={values.privateKeyPath} required />
          </Field>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" name="autoInvoiceOnPay" defaultChecked={values.autoInvoiceOnPay} className="size-4" />
            Emitir factura automáticamente al aprobarse el pago
          </label>
        </fieldset>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          Guardar configuración
        </Button>
        <FormStatus state={state} />
      </div>
    </form>
  );
}
