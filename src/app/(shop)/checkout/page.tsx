"use client";

/* ------------------------------------------------------------------ */
/*  Checkout page — multi-step form                                    */
/* ------------------------------------------------------------------ */

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  CreditCard,
  Truck,
  Package,
  MapPin,
  Home,
  User,
  Mail,
  Phone,
  FileText,
  ShoppingBag,
} from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { useCartStore } from "@/lib/store/cart";
import { siteConfig } from "@/lib/config/site.config";
import { createOrderFromCart } from "@/lib/actions/orders";
import { startPaymentAction } from "@/lib/actions/payments";
import { formatHUF } from "@/lib/utils/format";
import {
  getAvailableCarriers,
  getCarrierFee,
} from "@/lib/utils/shipping";
import { cn } from "@/lib/utils";
import type {
  ShippingMethod,
  HomeDeliveryCarrier,
  PickupPointProvider,
  CheckoutFormData,
} from "@/lib/types";

import { CartLineItem } from "@/components/cart/cart-line-item";
import { OrderSummary } from "@/components/cart/order-summary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";

// ── Constants ──────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: "Kapcsolat es szamlazas", icon: User },
  { id: 2, label: "Szallitas", icon: Truck },
  { id: 3, label: "Osszegzes es fizetes", icon: CreditCard },
] as const;

const MOCK_PICKUP_POINTS: Record<
  PickupPointProvider,
  Array<{ id: string; label: string }>
> = {
  foxpost: [
    { id: "FP-BP-001", label: "Foxpost - Budapest, Westend" },
    { id: "FP-BP-002", label: "Foxpost - Budapest, Arena Mall" },
    { id: "FP-DEB-001", label: "Foxpost - Debrecen, Forum" },
  ],
  gls_automata: [
    { id: "GLS-BP-001", label: "GLS Automata - Budapest, Keleti pu." },
    { id: "GLS-BP-002", label: "GLS Automata - Budapest, Deli pu." },
  ],
  packeta: [
    { id: "PKT-BP-001", label: "Packeta - Budapest, Blaha Lujza ter" },
    { id: "PKT-GYR-001", label: "Packeta - Gyor, Arkad" },
  ],
  mpl_automata: [
    { id: "MPL-BP-001", label: "MPL Automata - Budapest, Corvin" },
    { id: "MPL-SZG-001", label: "MPL Automata - Szeged, Auchan" },
  ],
  easybox: [
    { id: "EB-BP-001", label: "Easybox - Budapest, Mammut" },
    { id: "EB-PCS-001", label: "Easybox - Pecs, Arkad" },
  ],
};

// ── Form schema ────────────────────────────────────────────────────

const hungarianPhoneRegex = /^\+36\s?\d{2}\s?\d{3}\s?\d{4}$/;

const addressSchema = z.object({
  name: z.string().min(1, "A nev megadasa kotelezo"),
  street: z.string().min(1, "Az utca megadasa kotelezo"),
  city: z.string().min(1, "A varos megadasa kotelezo"),
  zip: z.string().regex(/^\d{4}$/, "Az iranyitoszam 4 szamjegyu kell legyen"),
  country: z.string().min(1, "Az ország megadása kötelező"),
});

const checkoutFormSchema = z.object({
  // Step 1
  email: z.string().email("Ervenytelen e-mail cim"),
  phone: z
    .string()
    .regex(hungarianPhoneRegex, "Ervenytelen magyar telefonszam (pl. +36 30 123 4567)"),
  billingAddress: addressSchema,
  sameAsBilling: z.boolean(),
  shippingAddressOverride: addressSchema.optional(),

  // Step 2
  shippingMethod: z.enum(["home", "pickup"]),
  carrier: z.string().optional(),
  pickupPointProvider: z.string().optional(),
  pickupPointId: z.string().optional(),
  pickupPointLabel: z.string().optional(),

  // Step 3
  notes: z.string().optional(),
  termsAccepted: z.boolean(),
});

type CheckoutFormValues = z.infer<typeof checkoutFormSchema>;

// ── Component ──────────────────────────────────────────────────────

export default function CheckoutPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const items = useCartStore((s) => s.items);
  const subtotal = useCartStore((s) => s.subtotal());
  const couponCode = useCartStore((s) => s.couponCode);
  const couponDiscount = useCartStore((s) => s.couponDiscount);
  const clearCart = useCartStore((s) => s.clearCart);

  const homeCarriers = useMemo(() => getAvailableCarriers("home"), []);
  const pickupCarriers = useMemo(() => getAvailableCarriers("pickup"), []);

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
        country: "Magyarorszag",
      },
      sameAsBilling: true,
      shippingAddressOverride: {
        name: "",
        street: "",
        city: "",
        zip: "",
        country: "Magyarorszag",
      },
      shippingMethod: "home",
      carrier: homeCarriers[0]?.id ?? "",
      pickupPointProvider: "",
      pickupPointId: "",
      pickupPointLabel: "",
      notes: "",
      termsAccepted: false,
    },
  });

  const watchedValues = watch();
  const sameAsBilling = watchedValues.sameAsBilling;
  const shippingMethod = watchedValues.shippingMethod as ShippingMethod;
  const selectedCarrier = watchedValues.carrier ?? "";
  const selectedPickupProvider = watchedValues.pickupPointProvider ?? "";
  const selectedPickupPointId = watchedValues.pickupPointId ?? "";

  // Calculate shipping fee based on selections
  const shippingFee = useMemo(() => {
    if (shippingMethod === "home" && selectedCarrier) {
      return getCarrierFee("home", selectedCarrier, subtotal) ?? 0;
    }
    if (shippingMethod === "pickup" && selectedPickupProvider) {
      return getCarrierFee("pickup", selectedPickupProvider, subtotal) ?? 0;
    }
    return 0;
  }, [shippingMethod, selectedCarrier, selectedPickupProvider, subtotal]);

  const total = Math.max(0, subtotal + shippingFee - couponDiscount);

  // ── Step navigation ──────────────────────────────────────────────

  const goToStep = useCallback(
    async (target: number) => {
      if (target > currentStep) {
        // Validate current step fields before advancing
        let fieldsToValidate: (keyof CheckoutFormValues)[] = [];

        if (currentStep === 1) {
          fieldsToValidate = ["email", "phone", "billingAddress"];
          if (!sameAsBilling) {
            fieldsToValidate.push("shippingAddressOverride");
          }
        } else if (currentStep === 2) {
          fieldsToValidate = ["shippingMethod"];
          if (shippingMethod === "home") {
            fieldsToValidate.push("carrier");
          } else {
            fieldsToValidate.push(
              "pickupPointProvider",
              "pickupPointId",
              "pickupPointLabel",
            );
          }
        }

        const valid = await trigger(fieldsToValidate);
        if (!valid) return;
      }

      setCurrentStep(target);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [currentStep, trigger, sameAsBilling, shippingMethod],
  );

  // ── Submit handler ───────────────────────────────────────────────

  const onSubmit = useCallback(
    async (data: CheckoutFormValues) => {
      if (!data.termsAccepted) {
        toast.error("Kerlek, fogadd el az Altalanos Szerzodesi Felteteleket.");
        return;
      }

      if (items.length === 0) {
        toast.error("A kosarad ures.");
        return;
      }

      setIsSubmitting(true);

      try {
        // Build CheckoutFormData for the server action
        const shippingAddress =
          data.shippingMethod === "home"
            ? data.sameAsBilling
              ? data.billingAddress
              : data.shippingAddressOverride ?? data.billingAddress
            : { name: "", street: "", city: "", zip: "", country: "HU" };

        const checkoutData: CheckoutFormData = {
          email: data.email,
          phone: data.phone,
          shippingMethod: data.shippingMethod as ShippingMethod,
          shippingAddress: {
            ...shippingAddress,
            country: shippingAddress.country === "Magyarorszag" ? "HU" : shippingAddress.country,
          },
          billingAddress: {
            ...data.billingAddress,
            country: data.billingAddress.country === "Magyarorszag" ? "HU" : data.billingAddress.country,
          },
          sameAsBilling: data.sameAsBilling,
          pickupPointProvider:
            data.shippingMethod === "pickup"
              ? (data.pickupPointProvider as PickupPointProvider) ?? null
              : null,
          pickupPointId:
            data.shippingMethod === "pickup"
              ? data.pickupPointId ?? null
              : null,
          pickupPointLabel:
            data.shippingMethod === "pickup"
              ? data.pickupPointLabel ?? null
              : null,
          carrier:
            data.shippingMethod === "home"
              ? (data.carrier as HomeDeliveryCarrier) ?? null
              : null,
          notes: data.notes ?? "",
          couponCode: couponCode ?? "",
        };

        // 1. Create order
        const orderResult = await createOrderFromCart({
          items,
          checkout: checkoutData,
        });

        if (!orderResult.success || !orderResult.data) {
          toast.error(orderResult.error ?? "Hiba tortent a rendeles letrehozasakor.");
          setIsSubmitting(false);
          return;
        }

        const { orderId } = orderResult.data;

        // 2. Start Barion payment
        const paymentResult = await startPaymentAction(orderId);

        if (!paymentResult.success || !paymentResult.data) {
          toast.error(paymentResult.error ?? "Hiba tortent a fizetes inditasakor.");
          // Order was created — redirect to success with orderId
          // (payment can be retried from admin)
          router.push(`/checkout/success?orderId=${orderId}`);
          clearCart();
          setIsSubmitting(false);
          return;
        }

        // 3. Clear cart and redirect to Barion gateway
        clearCart();
        window.location.href = paymentResult.data.gatewayUrl;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("[Checkout] Submit error:", message);
        toast.error("Varatlan hiba tortent. Kerlek, probald ujra.");
        setIsSubmitting(false);
      }
    },
    [items, couponCode, router, clearCart],
  );

  // ── Empty cart guard ─────────────────────────────────────────────

  if (items.length === 0 && !isSubmitting) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        <div className="mt-20 flex flex-col items-center justify-center text-center">
          <div className="flex size-20 items-center justify-center rounded-full bg-muted">
            <ShoppingBag className="size-8 text-muted-foreground" />
          </div>
          <h1 className="mt-6 text-2xl font-semibold tracking-[-0.02em]">
            A kosarad ures
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Adj hozza termekeket a kosaradhoz a fizetes elott.
          </p>
          <Button
            className="mt-8"
            size="lg"
            render={<Link href="/products" />}
          >
            Termekek bongeszese
          </Button>
        </div>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
      <h1 className="text-3xl font-semibold tracking-[-0.03em]">
        Penztar
      </h1>

      {/* ── Step indicators ────────────────────────────── */}
      <div className="mt-8 flex items-center gap-0">
        {STEPS.map((step, idx) => {
          const StepIcon = step.icon;
          const isActive = currentStep === step.id;
          const isCompleted = currentStep > step.id;

          return (
            <div key={step.id} className="flex items-center">
              {idx > 0 && (
                <div
                  className={cn(
                    "mx-3 h-px w-8 transition-colors duration-500 sm:w-16",
                    isCompleted ? "bg-foreground" : "bg-border",
                  )}
                />
              )}
              <button
                type="button"
                onClick={() => {
                  if (isCompleted) void goToStep(step.id);
                }}
                disabled={!isCompleted && !isActive}
                className={cn(
                  "flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-500",
                  isActive && "bg-foreground text-background",
                  isCompleted &&
                    "cursor-pointer bg-muted text-foreground hover:bg-muted/80",
                  !isActive &&
                    !isCompleted &&
                    "cursor-default text-muted-foreground",
                )}
              >
                {isCompleted ? (
                  <Check className="size-4" />
                ) : (
                  <StepIcon className="size-4" />
                )}
                <span className="hidden sm:inline">{step.label}</span>
                <span className="sm:hidden">{step.id}</span>
              </button>
            </div>
          );
        })}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-10">
        <div className="grid gap-12 lg:grid-cols-[1fr_380px]">
          {/* ── Left: Form steps ───────────────────────── */}
          <div>
            {/* ── STEP 1: Contact & Billing ────────────── */}
            {currentStep === 1 && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-lg font-semibold tracking-[-0.02em]">
                    Kapcsolat
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Adja meg elerhettosegi adatait a rendeleshez.
                  </p>

                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <FormField
                      label="E-mail cim"
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
                      label="Telefonszam"
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

                {/* ── Billing address ──────────────────── */}
                <div>
                  <h2 className="text-lg font-semibold tracking-[-0.02em]">
                    Szamlazasi cim
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    A szamla erre a cimre kerul kiallitasra.
                  </p>

                  <AddressFields
                    prefix="billingAddress"
                    register={register}
                    errors={errors.billingAddress as Record<string, { message?: string }> | undefined}
                  />
                </div>

                <Separator />

                {/* ── Same as billing checkbox ──────────── */}
                <div>
                  <Controller
                    name="sameAsBilling"
                    control={control}
                    render={({ field }) => (
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={(checked) =>
                            field.onChange(checked === true)
                          }
                        />
                        <Label className="cursor-pointer text-sm">
                          Szallitasi cim megegyezik a szamlazasi cimmel
                        </Label>
                      </div>
                    )}
                  />

                  {/* ── Separate shipping address ──────── */}
                  {!sameAsBilling && (
                    <div className="mt-6">
                      <h3 className="text-base font-medium">Szallitasi cim</h3>
                      <AddressFields
                        prefix="shippingAddressOverride"
                        register={register}
                        errors={errors.shippingAddressOverride as Record<string, { message?: string }> | undefined}
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4">
                  <Link
                    href="/cart"
                    className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors duration-300 hover:text-foreground"
                  >
                    <ArrowLeft className="size-3.5" />
                    Vissza a kosarhoz
                  </Link>
                  <Button
                    type="button"
                    size="lg"
                    onClick={() => void goToStep(2)}
                  >
                    Tovabb
                    <ArrowRight className="ml-1.5 size-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* ── STEP 2: Shipping ─────────────────────── */}
            {currentStep === 2 && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-lg font-semibold tracking-[-0.02em]">
                    Szallitasi mod
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Valasszon szallitasi modot es futarszolgalatot.
                  </p>
                </div>

                {/* ── Two shipping paths ───────────────── */}
                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Home delivery */}
                  {siteConfig.shipping.methods.homeDelivery && (
                    <button
                      type="button"
                      onClick={() => {
                        setValue("shippingMethod", "home");
                        if (!selectedCarrier && homeCarriers[0]) {
                          setValue("carrier", homeCarriers[0].id);
                        }
                      }}
                      className={cn(
                        "flex flex-col items-start gap-3 rounded-xl border p-5 text-left transition-all duration-500",
                        shippingMethod === "home"
                          ? "border-foreground bg-foreground/[0.03]"
                          : "border-border hover:border-foreground/30",
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <Home className="size-5" />
                        <span className="font-medium">
                          Hazhozsz&aacute;ll&iacute;t&aacute;s
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Futarszolgalat altal szallitva az On altal megadott cimre.
                      </p>
                    </button>
                  )}

                  {/* Pickup point */}
                  {siteConfig.shipping.methods.pickupPoint && (
                    <button
                      type="button"
                      onClick={() => {
                        setValue("shippingMethod", "pickup");
                        if (!selectedPickupProvider && pickupCarriers[0]) {
                          setValue("pickupPointProvider", pickupCarriers[0].id);
                        }
                      }}
                      className={cn(
                        "flex flex-col items-start gap-3 rounded-xl border p-5 text-left transition-all duration-500",
                        shippingMethod === "pickup"
                          ? "border-foreground bg-foreground/[0.03]"
                          : "border-border hover:border-foreground/30",
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <Package className="size-5" />
                        <span className="font-medium">
                          Csomagautomata / Atveteli pont
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Csomagautomatabol vagy atveteli ponton veheto at.
                      </p>
                    </button>
                  )}
                </div>

                <Separator />

                {/* ── Home delivery carriers ──────────── */}
                {shippingMethod === "home" && (
                  <div className="space-y-4">
                    <h3 className="text-base font-medium">
                      Futarszolgalat valasztasa
                    </h3>
                    <div className="space-y-3">
                      {homeCarriers.map((carrier) => {
                        const fee = getCarrierFee("home", carrier.id, subtotal);
                        const isSelected = selectedCarrier === carrier.id;

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
                                <span className="text-sm font-medium">
                                  {carrier.name}
                                </span>
                              </div>
                            </div>
                            <span className="text-sm font-medium tabular-nums">
                              {fee === 0 ? "Ingyenes" : formatHUF(fee ?? 0)}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ── Pickup point providers ──────────── */}
                {shippingMethod === "pickup" && (
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <h3 className="text-base font-medium">
                        Szolgaltato valasztasa
                      </h3>
                      <div className="space-y-3">
                        {pickupCarriers.map((carrier) => {
                          const fee = getCarrierFee(
                            "pickup",
                            carrier.id,
                            subtotal,
                          );
                          const isSelected =
                            selectedPickupProvider === carrier.id;

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
                                  checked={isSelected}
                                  onChange={() => {
                                    setValue("pickupPointProvider", carrier.id);
                                    setValue("pickupPointId", "");
                                    setValue("pickupPointLabel", "");
                                  }}
                                  className="size-4 accent-foreground"
                                />
                                <span className="text-sm font-medium">
                                  {carrier.name}
                                </span>
                              </div>
                              <span className="text-sm font-medium tabular-nums">
                                {fee === 0
                                  ? "Ingyenes"
                                  : formatHUF(fee ?? 0)}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* ── Pickup point selector ─────────── */}
                    {selectedPickupProvider && (
                      <div className="space-y-3">
                        <h3 className="text-base font-medium">
                          <MapPin className="mr-1.5 inline-block size-4" />
                          Atveteli pont valasztasa
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          Valasszon a lista erhetoe atveteli pontok kozul.
                        </p>
                        <div className="space-y-2">
                          {(
                            MOCK_PICKUP_POINTS[
                              selectedPickupProvider as PickupPointProvider
                            ] ?? []
                          ).map((point) => (
                            <label
                              key={point.id}
                              className={cn(
                                "flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition-all duration-300",
                                selectedPickupPointId === point.id
                                  ? "border-foreground bg-foreground/[0.03]"
                                  : "border-border hover:border-foreground/30",
                              )}
                            >
                              <input
                                type="radio"
                                checked={selectedPickupPointId === point.id}
                                onChange={() => {
                                  setValue("pickupPointId", point.id);
                                  setValue("pickupPointLabel", point.label);
                                }}
                                className="size-4 accent-foreground"
                              />
                              <div>
                                <span className="text-sm">{point.label}</span>
                                <span className="ml-2 text-xs text-muted-foreground">
                                  ({point.id})
                                </span>
                              </div>
                            </label>
                          ))}
                        </div>
                        {errors.pickupPointId && (
                          <p className="text-sm text-red-600 dark:text-red-400">
                            Kerlek, valassz atveteli pontot.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between pt-4">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => void goToStep(1)}
                  >
                    <ArrowLeft className="mr-1.5 size-4" />
                    Vissza
                  </Button>
                  <Button
                    type="button"
                    size="lg"
                    onClick={() => void goToStep(3)}
                  >
                    Tovabb
                    <ArrowRight className="ml-1.5 size-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* ── STEP 3: Review & Pay ─────────────────── */}
            {currentStep === 3 && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-lg font-semibold tracking-[-0.02em]">
                    Rendeles osszegzese
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Ellenorizze a rendeles reszleteit a fizetes elott.
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
                              <p className="text-xs text-muted-foreground">
                                {item.variantLabel}
                              </p>
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

                  <ReviewSection title="Szamlazasi cim">
                    <p>{watchedValues.billingAddress.name}</p>
                    <p>{watchedValues.billingAddress.street}</p>
                    <p>
                      {watchedValues.billingAddress.zip}{" "}
                      {watchedValues.billingAddress.city}
                    </p>
                    <p>{watchedValues.billingAddress.country}</p>
                  </ReviewSection>

                  <ReviewSection title="Szallitas">
                    {shippingMethod === "home" ? (
                      <>
                        <p className="font-medium">
                          Hazhozsz&aacute;ll&iacute;t&aacute;s &mdash;{" "}
                          {homeCarriers.find((c) => c.id === selectedCarrier)
                            ?.name ?? selectedCarrier}
                        </p>
                        {sameAsBilling ? (
                          <p className="text-muted-foreground">
                            Megegyezik a szamlazasi cimmel
                          </p>
                        ) : (
                          <>
                            <p>
                              {watchedValues.shippingAddressOverride?.name}
                            </p>
                            <p>
                              {watchedValues.shippingAddressOverride?.street}
                            </p>
                            <p>
                              {watchedValues.shippingAddressOverride?.zip}{" "}
                              {watchedValues.shippingAddressOverride?.city}
                            </p>
                          </>
                        )}
                      </>
                    ) : (
                      <>
                        <p className="font-medium">
                          Csomagautomata &mdash;{" "}
                          {pickupCarriers.find(
                            (c) => c.id === selectedPickupProvider,
                          )?.name ?? selectedPickupProvider}
                        </p>
                        <p>{watchedValues.pickupPointLabel}</p>
                        <p className="text-xs text-muted-foreground">
                          {watchedValues.pickupPointId}
                        </p>
                      </>
                    )}
                  </ReviewSection>

                  {shippingFee > 0 && (
                    <ReviewSection title="Szallitasi dij">
                      <p className="font-medium">{formatHUF(shippingFee)}</p>
                    </ReviewSection>
                  )}
                </div>

                {/* ── Notes ────────────────────────────── */}
                <div>
                  <Label className="mb-2 text-sm">
                    <FileText className="size-4" />
                    Megjegyzes (opcionalis)
                  </Label>
                  <Textarea
                    placeholder="Megegyzes a rendeleshez..."
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
                        onCheckedChange={(checked) =>
                          field.onChange(checked === true)
                        }
                        className="mt-0.5"
                      />
                      <Label className="cursor-pointer text-sm leading-relaxed">
                        Elfogadom az{" "}
                        <Link
                          href="/terms"
                          target="_blank"
                          className="underline underline-offset-2 transition-colors hover:text-foreground/70"
                        >
                          Altalanos Szerzodesi Felteteleket
                        </Link>{" "}
                        es az{" "}
                        <Link
                          href="/privacy"
                          target="_blank"
                          className="underline underline-offset-2 transition-colors hover:text-foreground/70"
                        >
                          Adatkezelesi Tajekeztatot
                        </Link>
                        .
                      </Label>
                    </div>
                  )}
                />

                <div className="flex items-center justify-between pt-4">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => void goToStep(2)}
                  >
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
                        Feldolgozas...
                      </>
                    ) : (
                      <>
                        <CreditCard className="mr-1.5 size-4" />
                        Fizetes &mdash; {formatHUF(total)}
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
                total={total}
              />
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

/* ================================================================== */
/*  Sub-components                                                     */
/* ================================================================== */

function FormField({
  label,
  error,
  icon,
  children,
}: {
  label: string;
  error?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">
        {icon}
        {label}
      </Label>
      {children}
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}

function AddressFields({
  prefix,
  register,
  errors,
}: {
  prefix: "billingAddress" | "shippingAddressOverride";
  register: ReturnType<typeof useForm<CheckoutFormValues>>["register"];
  errors?: Record<string, { message?: string }>;
}) {
  return (
    <div className="mt-4 grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <FormField
          label="Teljes nev"
          error={errors?.name?.message}
        >
          <Input
            placeholder="Kovacs Janos"
            {...register(`${prefix}.name`)}
            aria-invalid={!!errors?.name}
          />
        </FormField>
      </div>

      <div className="sm:col-span-2">
        <FormField
          label="Utca, hazszam"
          error={errors?.street?.message}
        >
          <Input
            placeholder="Vaci utca 1."
            {...register(`${prefix}.street`)}
            aria-invalid={!!errors?.street}
          />
        </FormField>
      </div>

      <FormField label="Varos" error={errors?.city?.message}>
        <Input
          placeholder="Budapest"
          {...register(`${prefix}.city`)}
          aria-invalid={!!errors?.city}
        />
      </FormField>

      <FormField
        label="Iranyitoszam"
        error={errors?.zip?.message}
      >
        <Input
          placeholder="1052"
          maxLength={4}
          {...register(`${prefix}.zip`)}
          aria-invalid={!!errors?.zip}
        />
      </FormField>

      <div className="sm:col-span-2">
        <FormField label="Orszag" error={errors?.country?.message}>
          <Input
            defaultValue="Magyarorszag"
            {...register(`${prefix}.country`)}
            aria-invalid={!!errors?.country}
          />
        </FormField>
      </div>
    </div>
  );
}

function ReviewSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border p-4">
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {title}
      </h4>
      <div className="space-y-0.5 text-sm">{children}</div>
    </div>
  );
}
