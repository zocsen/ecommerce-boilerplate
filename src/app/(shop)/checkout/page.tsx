"use client"

/* ------------------------------------------------------------------ */
/*  Checkout page — multi-step form                                    */
/* ------------------------------------------------------------------ */

import { useState, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  CreditCard,
  Truck,
  Package,
  Home,
  User,
  Mail,
  Phone,
  FileText,
  ShoppingBag,
  Wallet,
} from "lucide-react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"

import { useCartStore } from "@/lib/store/cart"
import { siteConfig } from "@/lib/config/site.config"
import { createOrderFromCart } from "@/lib/actions/orders"
import { startPaymentAction } from "@/lib/actions/payments"
import { formatHUF } from "@/lib/utils/format"
import { getAvailableCarriers, getCarrierFee } from "@/lib/utils/shipping"
import { cn } from "@/lib/utils"
import type {
  ShippingMethod,
  HomeDeliveryCarrier,
  PickupPointProvider,
  CheckoutFormData,
} from "@/lib/types"

import { CartLineItem } from "@/components/cart/cart-line-item"
import { OrderSummary } from "@/components/cart/order-summary"
import { PickupPointSelector } from "@/components/cart/pickup-point-selector"
import { CheckoutStepper } from "@/components/checkout/checkout-stepper"
import { AddressFields, FormField, ReviewSection } from "@/components/checkout/address-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"

// ── Constants ──────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: "Szállítás", icon: Truck },
  { id: 2, label: "Kapcsolat és számlázás", icon: User },
  { id: 3, label: "Összegzés és fizetés", icon: CreditCard },
] as const

const MOCK_PICKUP_POINTS: Record<PickupPointProvider, Array<{ id: string; label: string }>> = {
  foxpost: [
    { id: "FP-BP-001", label: "Foxpost - Budapest, Westend" },
    { id: "FP-BP-002", label: "Foxpost - Budapest, Arena Mall" },
    { id: "FP-DEB-001", label: "Foxpost - Debrecen, Forum" },
  ],
  gls_automata: [
    { id: "GLS-BP-001", label: "GLS Automata - Budapest, Keleti pu." },
    { id: "GLS-BP-002", label: "GLS Automata - Budapest, Déli pu." },
  ],
  packeta: [
    { id: "PKT-BP-001", label: "Packeta - Budapest, Blaha Lujza tér" },
    { id: "PKT-GYR-001", label: "Packeta - Győr, Árkád" },
  ],
  mpl_automata: [
    { id: "MPL-BP-001", label: "MPL Automata - Budapest, Corvin" },
    { id: "MPL-SZG-001", label: "MPL Automata - Szeged, Auchan" },
  ],
  easybox: [
    { id: "EB-BP-001", label: "Easybox - Budapest, Mammut" },
    { id: "EB-PCS-001", label: "Easybox - Pécs, Árkád" },
  ],
}

// ── Form schema ────────────────────────────────────────────────────

const hungarianPhoneRegex = /^\+36\s?\d{2}\s?\d{3}\s?\d{4}$/

const checkoutFormSchema = z
  .object({
    // Step 1 — Shipping
    shippingMethod: z.enum(["home", "pickup"]),
    carrier: z.string().optional(),
    pickupPointProvider: z.string().optional(),
    pickupPointId: z.string().optional(),
    pickupPointLabel: z.string().optional(),

    // Step 2 — Contact & Billing
    email: z.string().email("Érvénytelen e-mail cím"),
    phone: z
      .string()
      .regex(hungarianPhoneRegex, "Érvénytelen magyar telefonszám (pl. +36 30 123 4567)"),
    billingAddress: z.object({
      name: z.string(),
      street: z.string(),
      city: z.string(),
      zip: z.string(),
      country: z.string(),
    }),
    sameAsBilling: z.boolean(),
    shippingAddressOverride: z
      .object({
        name: z.string(),
        street: z.string(),
        city: z.string(),
        zip: z.string(),
        country: z.string(),
      })
      .optional(),

    // Step 3 — Review & Pay
    paymentMethod: z.enum(["barion", "cod"]),
    notes: z.string().optional(),
    termsAccepted: z.boolean(),
  })
  .superRefine((data, ctx) => {
    const addAddressErrors = (
      addr: { name: string; street: string; city: string; zip: string; country: string },
      prefix: string,
    ) => {
      if (!addr.name || addr.name.length < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "A név megadása kötelező",
          path: [prefix, "name"],
        })
      }
      if (!addr.street || addr.street.length < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Az utca megadása kötelező",
          path: [prefix, "street"],
        })
      }
      if (!addr.city || addr.city.length < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "A város megadása kötelező",
          path: [prefix, "city"],
        })
      }
      if (!addr.zip || !/^\d{4}$/.test(addr.zip)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Az irányítószám 4 számjegyű kell legyen",
          path: [prefix, "zip"],
        })
      }
      if (!addr.country || addr.country.length < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Az ország megadása kötelező",
          path: [prefix, "country"],
        })
      }
    }

    if (data.shippingMethod === "home") {
      // Home delivery: shippingAddressOverride is the primary address
      if (data.shippingAddressOverride) {
        addAddressErrors(data.shippingAddressOverride, "shippingAddressOverride")
      } else {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "A szállítási cím megadása kötelező",
          path: ["shippingAddressOverride"],
        })
      }

      // billingAddress only validated when NOT same as shipping
      if (!data.sameAsBilling) {
        addAddressErrors(data.billingAddress, "billingAddress")
      }
    } else {
      // Pickup: only billingAddress required
      addAddressErrors(data.billingAddress, "billingAddress")
      // shippingAddressOverride is irrelevant — skip validation
    }
  })

type CheckoutFormValues = z.infer<typeof checkoutFormSchema>

// ── Component ──────────────────────────────────────────────────────

export default function CheckoutPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const items = useCartStore((s) => s.items)
  const subtotal = useCartStore((s) => s.subtotal())
  const couponCode = useCartStore((s) => s.couponCode)
  const couponDiscount = useCartStore((s) => s.couponDiscount)
  const clearCart = useCartStore((s) => s.clearCart)

  const homeCarriers = useMemo(() => getAvailableCarriers("home"), [])
  const pickupCarriers = useMemo(() => getAvailableCarriers("pickup"), [])

  // Compute total cart weight for weight-based shipping
  const totalWeightGrams = useMemo(
    () => items.reduce((sum, item) => sum + item.weightGrams * item.quantity, 0),
    [items],
  )

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    trigger,
    formState: { errors },
  } = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutFormSchema),
    defaultValues: {
      email: "",
      phone: "",
      billingAddress: {
        name: "",
        street: "",
        city: "",
        zip: "",
        country: "Magyarország",
      },
      sameAsBilling: true,
      shippingAddressOverride: {
        name: "",
        street: "",
        city: "",
        zip: "",
        country: "Magyarország",
      },
      shippingMethod: "home",
      carrier: homeCarriers[0]?.id ?? "",
      pickupPointProvider: "",
      pickupPointId: "",
      pickupPointLabel: "",
      paymentMethod: "barion",
      notes: "",
      termsAccepted: false,
    },
  })

  const watchedValues = watch()
  const sameAsBilling = watchedValues.sameAsBilling
  const shippingMethod = watchedValues.shippingMethod as ShippingMethod
  const selectedCarrier = watchedValues.carrier ?? ""
  const selectedPickupProvider = watchedValues.pickupPointProvider ?? ""
  const selectedPickupPointId = watchedValues.pickupPointId ?? ""

  // Calculate shipping fee based on selections
  const shippingFee = useMemo(() => {
    if (shippingMethod === "home" && selectedCarrier) {
      return getCarrierFee("home", selectedCarrier, subtotal, totalWeightGrams) ?? 0
    }
    if (shippingMethod === "pickup" && selectedPickupProvider) {
      return getCarrierFee("pickup", selectedPickupProvider, subtotal, totalWeightGrams) ?? 0
    }
    return 0
  }, [shippingMethod, selectedCarrier, selectedPickupProvider, subtotal, totalWeightGrams])

  // ── COD (utánvét) configuration ─────────────────────────────────
  const codConfig = siteConfig.payments.cod
  const selectedPaymentMethod = watchedValues.paymentMethod ?? "barion"

  const codAvailable = useMemo(() => {
    if (!codConfig.enabled) return false
    if (!codConfig.allowedShippingMethods.includes(shippingMethod)) return false
    // Check order total limit (subtotal + shipping, before COD fee)
    const preTotal = subtotal + shippingFee - couponDiscount
    if (codConfig.maxOrderAmount > 0 && preTotal > codConfig.maxOrderAmount) return false
    return true
  }, [codConfig, shippingMethod, subtotal, shippingFee, couponDiscount])

  // If COD becomes unavailable (e.g. total changed), reset to barion
  const effectiveCodFee = selectedPaymentMethod === "cod" && codAvailable ? codConfig.fee : 0

  const total = Math.max(0, subtotal + shippingFee + effectiveCodFee - couponDiscount)

  // ── Step navigation ──────────────────────────────────────────────

  const goToStep = useCallback(
    async (target: number) => {
      if (target > currentStep) {
        // Validate current step fields before advancing
        let fieldsToValidate: (keyof CheckoutFormValues)[] = []

        if (currentStep === 1) {
          fieldsToValidate = ["shippingMethod"]
          if (shippingMethod === "home") {
            fieldsToValidate.push("carrier")
          } else {
            fieldsToValidate.push("pickupPointProvider", "pickupPointId", "pickupPointLabel")
          }
        } else if (currentStep === 2) {
          fieldsToValidate = ["email", "phone"]
          if (shippingMethod === "pickup") {
            // Pickup: only billing address required
            fieldsToValidate.push("billingAddress")
          } else {
            // Home delivery: shipping address is the primary address
            fieldsToValidate.push("shippingAddressOverride")
            if (!sameAsBilling) {
              // Separate billing address was provided
              fieldsToValidate.push("billingAddress")
            }
          }
        }

        const valid = await trigger(fieldsToValidate)
        if (!valid) return
      }

      setCurrentStep(target)
      window.scrollTo({ top: 0, behavior: "smooth" })
    },
    [currentStep, trigger, sameAsBilling, shippingMethod],
  )

  // ── Submit handler ───────────────────────────────────────────────

  const onSubmit = useCallback(
    async (data: CheckoutFormValues) => {
      if (!data.termsAccepted) {
        toast.error("Kérlek, fogadd el az Általános Szerződési Feltételeket.")
        return
      }

      if (items.length === 0) {
        toast.error("A kosarad üres.")
        return
      }

      setIsSubmitting(true)

      try {
        // Build CheckoutFormData for the server action
        // Home delivery: shippingAddressOverride is the primary address;
        //   billing copies from it when sameAsBilling is checked.
        // Pickup: no home address needed; billing is entered directly.
        const shippingAddress =
          data.shippingMethod === "home"
            ? (data.shippingAddressOverride ?? data.billingAddress)
            : { name: "", street: "", city: "", zip: "", country: "HU" }

        const resolvedBillingAddress =
          data.shippingMethod === "home" && data.sameAsBilling
            ? (data.shippingAddressOverride ?? data.billingAddress)
            : data.billingAddress

        const checkoutData: CheckoutFormData = {
          email: data.email,
          phone: data.phone,
          shippingMethod: data.shippingMethod as ShippingMethod,
          shippingAddress: {
            ...shippingAddress,
            country: shippingAddress.country === "Magyarország" ? "HU" : shippingAddress.country,
          },
          billingAddress: {
            ...resolvedBillingAddress,
            country:
              resolvedBillingAddress.country === "Magyarország"
                ? "HU"
                : resolvedBillingAddress.country,
          },
          sameAsBilling: data.sameAsBilling,
          pickupPointProvider:
            data.shippingMethod === "pickup"
              ? ((data.pickupPointProvider as PickupPointProvider) ?? null)
              : null,
          pickupPointId: data.shippingMethod === "pickup" ? (data.pickupPointId ?? null) : null,
          pickupPointLabel:
            data.shippingMethod === "pickup" ? (data.pickupPointLabel ?? null) : null,
          carrier:
            data.shippingMethod === "home" ? ((data.carrier as HomeDeliveryCarrier) ?? null) : null,
          paymentMethod: data.paymentMethod === "cod" && codAvailable ? "cod" : "barion",
          notes: data.notes ?? "",
          couponCode: couponCode ?? "",
        }

        // 1. Create order
        const orderResult = await createOrderFromCart({
          items,
          checkout: checkoutData,
        })

        if (!orderResult.success || !orderResult.data) {
          toast.error(orderResult.error ?? "Hiba történt a rendelés létrehozásakor.")
          setIsSubmitting(false)
          return
        }

        const { orderId } = orderResult.data

        // 2. Payment method branching
        if (checkoutData.paymentMethod === "cod") {
          // COD: order is already in 'processing' status — no Barion payment needed
          clearCart()
          router.push(`/checkout/success?orderId=${orderId}&method=cod`)
        } else {
          // Barion: start online payment
          const paymentResult = await startPaymentAction(orderId)

          if (!paymentResult.success || !paymentResult.data) {
            toast.error(paymentResult.error ?? "Hiba történt a fizetés indításakor.")
            // Order was created — redirect to success with orderId
            // (payment can be retried from admin)
            router.push(`/checkout/success?orderId=${orderId}`)
            clearCart()
            setIsSubmitting(false)
            return
          }

          // 3. Clear cart and redirect to Barion gateway
          clearCart()
          window.location.href = paymentResult.data.gatewayUrl
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        console.error("[Checkout] Submit error:", message)
        toast.error("Váratlan hiba történt. Kérlek, próbáld újra.")
        setIsSubmitting(false)
      }
    },
    [items, couponCode, router, clearCart, codAvailable],
  )

  // ── Empty cart guard ─────────────────────────────────────────────

  if (items.length === 0 && !isSubmitting) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        <div className="mt-20 flex flex-col items-center justify-center text-center">
          <div className="flex size-20 items-center justify-center rounded-full bg-muted">
            <ShoppingBag className="size-8 text-muted-foreground" />
          </div>
          <h1 className="mt-6 text-2xl font-semibold tracking-[-0.02em]">A kosarad üres</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Adj hozzá termékeket a kosaradhoz a fizetés előtt.
          </p>
          <Button className="mt-8" size="lg" render={<Link href="/products" />}>
            Termékek böngészése
          </Button>
        </div>
      </div>
    )
  }

  // ── Render ───────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
      <h1 className="text-3xl font-semibold tracking-[-0.03em]">Pénztár</h1>

      {/* ── Step indicators ────────────────────────────── */}
      <CheckoutStepper
        steps={STEPS}
        currentStep={currentStep}
        onStepClick={(id) => void goToStep(id)}
      />

      <form onSubmit={handleSubmit(onSubmit)} className="mt-10">
        <div className="grid gap-12 lg:grid-cols-[1fr_380px]">
          {/* ── Left: Form steps ───────────────────────── */}
          <div>
            {/* ── STEP 1: Shipping ─────────────────────── */}
            {currentStep === 1 && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-lg font-semibold tracking-[-0.02em]">Szállítási mód</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Válasszon szállítási módot és futárszolgálatot.
                  </p>
                </div>

                {/* ── Two shipping paths ───────────────── */}
                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Home delivery */}
                  {siteConfig.shipping.methods.homeDelivery && (
                    <button
                      type="button"
                      onClick={() => {
                        setValue("shippingMethod", "home")
                        if (!selectedCarrier && homeCarriers[0]) {
                          setValue("carrier", homeCarriers[0].id)
                        }
                      }}
                      className={cn(
                        "flex cursor-pointer flex-col items-start gap-3 rounded-xl border p-5 text-left transition-all duration-500",
                        shippingMethod === "home"
                          ? "border-foreground bg-foreground/[0.03]"
                          : "border-border hover:border-foreground/30",
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <Home className="size-5" />
                        <span className="font-medium">Házhozszállítás</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Futárszolgálat által szállítva az Ön által megadott címre.
                      </p>
                    </button>
                  )}

                  {/* Pickup point */}
                  {siteConfig.shipping.methods.pickupPoint && (
                    <button
                      type="button"
                      onClick={() => {
                        setValue("shippingMethod", "pickup")
                        if (!selectedPickupProvider && pickupCarriers[0]) {
                          setValue("pickupPointProvider", pickupCarriers[0].id)
                        }
                      }}
                      className={cn(
                        "flex cursor-pointer flex-col items-start gap-3 rounded-xl border p-5 text-left transition-all duration-500",
                        shippingMethod === "pickup"
                          ? "border-foreground bg-foreground/[0.03]"
                          : "border-border hover:border-foreground/30",
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <Package className="size-5" />
                        <span className="font-medium">Csomagautomata / Átvételi pont</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Csomagautomatából vagy átvételi ponton vehető át.
                      </p>
                    </button>
                  )}
                </div>

                <Separator />

                {/* ── Home delivery carriers ──────────── */}
                {shippingMethod === "home" && (
                  <div className="space-y-4">
                    <h3 className="text-base font-medium">Futárszolgálat választása</h3>
                    <div className="space-y-3">
                      {homeCarriers.map((carrier) => {
                        const fee = getCarrierFee("home", carrier.id, subtotal)
                        const isSelected = selectedCarrier === carrier.id

                        return (
                          <label
                            key={carrier.id}
                            className={cn(
                              "flex cursor-pointer items-center justify-between rounded-lg border px-4 py-3.5 transition-all duration-300",
                              isSelected
                                ? "border-foreground bg-foreground/[0.03]"
                                : "border-border hover:border-foreground/30",
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="radio"
                                value={carrier.id}
                                {...register("carrier")}
                                className="size-4 accent-foreground"
                              />
                              <div>
                                <span className="text-sm font-medium">{carrier.name}</span>
                              </div>
                            </div>
                            <span className="text-sm font-medium tabular-nums">
                              {fee === 0 ? "Ingyenes" : formatHUF(fee ?? 0)}
                            </span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* ── Pickup point providers ──────────── */}
                {shippingMethod === "pickup" && (
                  <PickupPointSelector
                    carriers={pickupCarriers}
                    pointsByProvider={MOCK_PICKUP_POINTS}
                    selectedProvider={selectedPickupProvider}
                    selectedPointId={selectedPickupPointId}
                    subtotal={subtotal}
                    onProviderChange={(id) => {
                      setValue("pickupPointProvider", id)
                      setValue("pickupPointId", "")
                      setValue("pickupPointLabel", "")
                    }}
                    onPointChange={(id, label) => {
                      setValue("pickupPointId", id)
                      setValue("pickupPointLabel", label)
                    }}
                    pointError={errors.pickupPointId?.message}
                  />
                )}

                <div className="flex items-center justify-between pt-4">
                  <Link
                    href="/cart"
                    className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors duration-300 hover:text-foreground"
                  >
                    <ArrowLeft className="size-3.5" />
                    Vissza a kosárhoz
                  </Link>
                  <Button type="button" size="lg" onClick={() => void goToStep(2)}>
                    Tovább
                    <ArrowRight className="ml-1.5 size-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* ── STEP 2: Contact & Billing ────────────── */}
            {currentStep === 2 && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-lg font-semibold tracking-[-0.02em]">Kapcsolat</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Adja meg elérhetőségi adatait a rendeléshez.
                  </p>

                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <FormField
                      label="E-mail cím"
                      error={errors.email?.message}
                      icon={<Mail className="size-4" />}
                    >
                      <Input
                        type="email"
                        placeholder="pelda@email.hu"
                        {...register("email")}
                        aria-invalid={!!errors.email}
                      />
                    </FormField>

                    <FormField
                      label="Telefonszám"
                      error={errors.phone?.message}
                      icon={<Phone className="size-4" />}
                    >
                      <Input
                        type="tel"
                        placeholder="+36 30 123 4567"
                        {...register("phone")}
                        aria-invalid={!!errors.phone}
                      />
                    </FormField>
                  </div>
                </div>

                <Separator />

                {/* ── Address section — depends on shipping method ── */}
                {shippingMethod === "pickup" ? (
                  /* ── Pickup: only billing/invoice address ────── */
                  <div>
                    <h2 className="text-lg font-semibold tracking-[-0.02em]">Számlázási cím</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      A számla erre a címre kerül kiállításra.
                    </p>

                    <AddressFields
                      prefix="billingAddress"
                      register={register}
                      errors={
                        errors.billingAddress as Record<string, { message?: string }> | undefined
                      }
                    />
                  </div>
                ) : (
                  /* ── Home delivery: shipping address first, then optional separate billing ── */
                  <>
                    <div>
                      <h2 className="text-lg font-semibold tracking-[-0.02em]">Szállítási cím</h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        A csomag erre a címre kerül kiszállításra.
                      </p>

                      <AddressFields
                        prefix="shippingAddressOverride"
                        register={register}
                        errors={
                          errors.shippingAddressOverride as
                            | Record<string, { message?: string }>
                            | undefined
                        }
                      />
                    </div>

                    <Separator />

                    <div>
                      <Controller
                        name="sameAsBilling"
                        control={control}
                        render={({ field }) => (
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={(checked) => field.onChange(checked === true)}
                            />
                            <Label className="cursor-pointer text-sm">
                              Számlázási cím megegyezik a szállítási címmel
                            </Label>
                          </div>
                        )}
                      />

                      {/* ── Separate billing address ──────── */}
                      {!sameAsBilling && (
                        <div className="mt-6">
                          <h3 className="text-base font-medium">Számlázási cím</h3>
                          <AddressFields
                            prefix="billingAddress"
                            register={register}
                            errors={
                              errors.billingAddress as
                                | Record<string, { message?: string }>
                                | undefined
                            }
                          />
                        </div>
                      )}
                    </div>
                  </>
                )}

                <div className="flex items-center justify-between pt-4">
                  <Button type="button" variant="ghost" onClick={() => void goToStep(1)}>
                    <ArrowLeft className="mr-1.5 size-4" />
                    Vissza
                  </Button>
                  <Button type="button" size="lg" onClick={() => void goToStep(3)}>
                    Tovább
                    <ArrowRight className="ml-1.5 size-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* ── STEP 3: Review & Pay ─────────────────── */}
            {currentStep === 3 && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-lg font-semibold tracking-[-0.02em]">Rendelés összegzése</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Ellenőrizze a rendelés részleteit a fizetés előtt.
                  </p>
                </div>

                {/* ── Items list ───────────────────────── */}
                <div className="rounded-lg border border-border">
                  <div className="divide-y divide-border px-4">
                    {items.map((item) => (
                      <div
                        key={`${item.productId}-${item.variantId ?? "none"}`}
                        className="flex items-center justify-between py-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex size-10 items-center justify-center rounded bg-muted text-xs font-medium text-muted-foreground">
                            {item.quantity}x
                          </div>
                          <div>
                            <p className="text-sm font-medium">{item.title}</p>
                            {item.variantLabel && (
                              <p className="text-xs text-muted-foreground">{item.variantLabel}</p>
                            )}
                          </div>
                        </div>
                        <span className="text-sm font-medium tabular-nums">
                          {formatHUF(item.price * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── Contact summary ──────────────────── */}
                <div className="grid gap-6 sm:grid-cols-2">
                  <ReviewSection title="Kapcsolat">
                    <p>{watchedValues.email}</p>
                    <p>{watchedValues.phone}</p>
                  </ReviewSection>

                  <ReviewSection title="Szállítás">
                    {shippingMethod === "home" ? (
                      <>
                        <p className="font-medium">
                          Házhozszállítás —{" "}
                          {homeCarriers.find((c) => c.id === selectedCarrier)?.name ??
                            selectedCarrier}
                        </p>
                        <p>{watchedValues.shippingAddressOverride?.name}</p>
                        <p>{watchedValues.shippingAddressOverride?.street}</p>
                        <p>
                          {watchedValues.shippingAddressOverride?.zip}{" "}
                          {watchedValues.shippingAddressOverride?.city}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="font-medium">
                          Csomagautomata &mdash;{" "}
                          {pickupCarriers.find((c) => c.id === selectedPickupProvider)?.name ??
                            selectedPickupProvider}
                        </p>
                        <p>{watchedValues.pickupPointLabel}</p>
                        <p className="text-xs text-muted-foreground">
                          {watchedValues.pickupPointId}
                        </p>
                      </>
                    )}
                  </ReviewSection>

                  <ReviewSection title="Számlázási cím">
                    {shippingMethod === "home" && sameAsBilling ? (
                      <p className="text-muted-foreground">Megegyezik a szállítási címmel</p>
                    ) : (
                      <>
                        <p>{watchedValues.billingAddress.name}</p>
                        <p>{watchedValues.billingAddress.street}</p>
                        <p>
                          {watchedValues.billingAddress.zip} {watchedValues.billingAddress.city}
                        </p>
                        <p>{watchedValues.billingAddress.country}</p>
                      </>
                    )}
                  </ReviewSection>

                  {shippingFee > 0 && (
                    <ReviewSection title="Szállítási díj">
                      <p className="font-medium">
                        {formatHUF(shippingFee)}
                        {totalWeightGrams > 0 && (
                          <span className="ml-1.5 text-sm font-normal text-muted-foreground">
                            ({(totalWeightGrams / 1000).toFixed(1)} kg)
                          </span>
                        )}
                      </p>
                    </ReviewSection>
                  )}
                </div>

                {/* ── Payment method selector ──────────── */}
                <div>
                  <h3 className="text-sm font-semibold tracking-[-0.01em]">Fizetési mód</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Válassza ki a kívánt fizetési módot.
                  </p>
                  <Controller
                    name="paymentMethod"
                    control={control}
                    render={({ field }) => (
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        {/* Online payment (Barion) */}
                        <button
                          type="button"
                          onClick={() => field.onChange("barion")}
                          className={cn(
                            "flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-all duration-300",
                            field.value === "barion"
                              ? "border-foreground bg-foreground/[0.03] ring-1 ring-foreground/20"
                              : "border-border hover:border-foreground/30",
                          )}
                        >
                          <div className="flex items-center gap-2.5">
                            <CreditCard className="size-5 text-muted-foreground" />
                            <span className="text-sm font-medium">Online fizetés (Bankkártya)</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Biztonságos fizetés bankkártyával a Barion rendszerén keresztül.
                          </p>
                        </button>

                        {/* Cash on delivery (utánvét) */}
                        {codConfig.enabled && (
                          <button
                            type="button"
                            onClick={() => {
                              if (codAvailable) field.onChange("cod")
                            }}
                            disabled={!codAvailable}
                            className={cn(
                              "flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-all duration-300",
                              !codAvailable && "cursor-not-allowed opacity-50",
                              field.value === "cod" && codAvailable
                                ? "border-foreground bg-foreground/[0.03] ring-1 ring-foreground/20"
                                : "border-border hover:border-foreground/30",
                              !codAvailable && "hover:border-border",
                            )}
                          >
                            <div className="flex items-center gap-2.5">
                              <Wallet className="size-5 text-muted-foreground" />
                              <span className="text-sm font-medium">
                                Utánvét (Fizetés átvételkor)
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Fizetés a csomag átvételekor a futárnak készpénzzel vagy kártyával.
                            </p>
                            {codConfig.fee > 0 && codAvailable && (
                              <p className="text-xs font-medium text-muted-foreground">
                                + {formatHUF(codConfig.fee)} utánvét kezelési díj
                              </p>
                            )}
                            {!codAvailable && codConfig.enabled && (
                              <p className="text-xs text-red-600 dark:text-red-400">
                                {codConfig.maxOrderAmount > 0 &&
                                subtotal + shippingFee - couponDiscount > codConfig.maxOrderAmount
                                  ? `Utánvét nem elérhető ${formatHUF(codConfig.maxOrderAmount)} feletti rendelésekhez.`
                                  : "Utánvét nem elérhető a kiválasztott szállítási módhoz."}
                              </p>
                            )}
                          </button>
                        )}
                      </div>
                    )}
                  />
                </div>

                {/* ── Notes ────────────────────────────── */}
                <div>
                  <Label className="mb-2 text-sm">
                    <FileText className="size-4" />
                    Megjegyzés (opcionális)
                  </Label>
                  <Textarea
                    placeholder="Megjegyzés a rendeléshez..."
                    {...register("notes")}
                    className="min-h-[80px]"
                  />
                </div>

                <Separator />

                {/* ── Terms acceptance ─────────────────── */}
                <Controller
                  name="termsAccepted"
                  control={control}
                  render={({ field }) => (
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(checked) => field.onChange(checked === true)}
                        className="mt-0.5"
                      />
                      <Label className="cursor-pointer text-sm leading-relaxed">
                        Elfogadom az{" "}
                        <Link
                          href="/terms"
                          target="_blank"
                          className="underline underline-offset-2 transition-colors hover:text-foreground/70"
                        >
                          Általános Szerződési Feltételeket
                        </Link>{" "}
                        es az{" "}
                        <Link
                          href="/privacy"
                          target="_blank"
                          className="underline underline-offset-2 transition-colors hover:text-foreground/70"
                        >
                          Adatkezelési Tájékoztatót
                        </Link>
                        .
                      </Label>
                    </div>
                  )}
                />

                <div className="flex items-center justify-between pt-4">
                  <Button type="button" variant="ghost" onClick={() => void goToStep(2)}>
                    <ArrowLeft className="mr-1.5 size-4" />
                    Vissza
                  </Button>
                  <Button
                    type="submit"
                    size="lg"
                    disabled={isSubmitting || !watchedValues.termsAccepted}
                    className="min-w-[180px]"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-1.5 size-4 animate-spin" />
                        Feldolgozás...
                      </>
                    ) : selectedPaymentMethod === "cod" && codAvailable ? (
                      <>
                        <Package className="mr-1.5 size-4" />
                        Rendelés véglegesítése — {formatHUF(total)}
                      </>
                    ) : (
                      <>
                        <CreditCard className="mr-1.5 size-4" />
                        Fizetés — {formatHUF(total)}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* ── Right: Order summary (sticky) ──────────── */}
          <div className="hidden lg:block">
            <div className="sticky top-8">
              <OrderSummary
                subtotal={subtotal}
                shippingFee={shippingFee}
                discount={couponDiscount}
                codFee={effectiveCodFee}
                total={total}
              />
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
