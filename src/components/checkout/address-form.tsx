"use client"

import type { UseFormRegister } from "react-hook-form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

/* ------------------------------------------------------------------ */
/*  FormField — labelled input wrapper with error display               */
/* ------------------------------------------------------------------ */

export interface FormFieldProps {
  label: string
  error?: string
  icon?: React.ReactNode
  children: React.ReactNode
}

/**
 * Simple form field wrapper: label + children + optional error message.
 */
export function FormField({ label, error, icon, children }: FormFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">
        {icon}
        {label}
      </Label>
      {children}
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  AddressFields — reusable address block (billing / shipping)         */
/* ------------------------------------------------------------------ */

export interface AddressFieldsProps {
  prefix: "billingAddress" | "shippingAddressOverride"
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register: UseFormRegister<any>
  errors?: Record<string, { message?: string }>
}

/**
 * Standard Hungarian address form fields: name, street, city, zip, country.
 */
export function AddressFields({ prefix, register, errors }: AddressFieldsProps) {
  return (
    <div className="mt-4 grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <FormField label="Teljes név" error={errors?.name?.message}>
          <Input
            placeholder="Kovács János"
            {...register(`${prefix}.name`)}
            aria-invalid={!!errors?.name}
          />
        </FormField>
      </div>

      <div className="sm:col-span-2">
        <FormField label="Utca, házszám" error={errors?.street?.message}>
          <Input
            placeholder="Váci utca 1."
            {...register(`${prefix}.street`)}
            aria-invalid={!!errors?.street}
          />
        </FormField>
      </div>

      <FormField label="Város" error={errors?.city?.message}>
        <Input
          placeholder="Budapest"
          {...register(`${prefix}.city`)}
          aria-invalid={!!errors?.city}
        />
      </FormField>

      <FormField label="Irányítószám" error={errors?.zip?.message}>
        <Input
          placeholder="1052"
          maxLength={4}
          {...register(`${prefix}.zip`)}
          aria-invalid={!!errors?.zip}
        />
      </FormField>

      <div className="sm:col-span-2">
        <FormField label="Ország" error={errors?.country?.message}>
          <Input
            defaultValue="Magyarország"
            {...register(`${prefix}.country`)}
            aria-invalid={!!errors?.country}
          />
        </FormField>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  ReviewSection — summary card used on the checkout review step       */
/* ------------------------------------------------------------------ */

export interface ReviewSectionProps {
  title: string
  children: React.ReactNode
}

/**
 * Bordered section with uppercase heading — used in checkout step 3
 * to display a summary of contact / shipping / billing info.
 */
export function ReviewSection({ title, children }: ReviewSectionProps) {
  return (
    <div className="rounded-lg border border-border p-4">
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {title}
      </h4>
      <div className="space-y-0.5 text-sm">{children}</div>
    </div>
  )
}
