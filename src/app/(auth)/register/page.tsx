"use client";

/* ------------------------------------------------------------------ */
/*  Register page                                                      */
/* ------------------------------------------------------------------ */

import { useState, useCallback } from "react";
import Link from "next/link";
import { Loader2, Mail, Lock, User, CheckCircle2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// ── Schema ─────────────────────────────────────────────────────────

const registerSchema = z
  .object({
    fullName: z.string().min(1, "A nev megadasa kotelezo"),
    email: z.string().email("Ervenytelen e-mail cim"),
    password: z.string().min(6, "A jelszo legalabb 6 karakter kell legyen"),
    confirmPassword: z.string().min(1, "A jelszo megerositese kotelezo"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "A jelszavak nem egyeznek",
    path: ["confirmPassword"],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

// ── Component ──────────────────────────────────────────────────────

export default function RegisterPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = useCallback(async (data: RegisterFormValues) => {
    setIsLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.fullName,
          },
        },
      });

      if (error) {
        toast.error(error.message);
        setIsLoading(false);
        return;
      }

      setIsSuccess(true);
    } catch {
      toast.error("Varatlan hiba tortent. Kerlek, probald ujra.");
      setIsLoading(false);
    }
  }, []);

  // ── Success state ────────────────────────────────────────────────

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/30">
          <CheckCircle2 className="size-7 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h1 className="mt-4 text-xl font-semibold tracking-[-0.02em]">
          Ellenorizd az e-mail fiokod
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Kuldtunk egy megerosito e-mailt. Kerlek, kattints a linkre a
          regisztracio befejezeesehez.
        </p>
        <Link
          href="/login"
          className="mt-6 text-sm font-medium text-foreground underline underline-offset-2 transition-colors hover:text-foreground/70"
        >
          Vissza a bejelentkezeshez
        </Link>
      </div>
    );
  }

  // ── Form ─────────────────────────────────────────────────────────

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-[-0.02em]">
        Regisztracio
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Hozzon letre egy fiokot a vasarlashoz.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
        {/* ── Full name ────────────────────────────────── */}
        <div className="space-y-1.5">
          <Label className="text-sm">
            <User className="size-4" />
            Teljes nev
          </Label>
          <Input
            type="text"
            placeholder="Kovacs Janos"
            autoComplete="name"
            {...register("fullName")}
            aria-invalid={!!errors.fullName}
            disabled={isLoading}
          />
          {errors.fullName && (
            <p className="text-xs text-red-600 dark:text-red-400">
              {errors.fullName.message}
            </p>
          )}
        </div>

        {/* ── Email ────────────────────────────────────── */}
        <div className="space-y-1.5">
          <Label className="text-sm">
            <Mail className="size-4" />
            E-mail cim
          </Label>
          <Input
            type="email"
            placeholder="pelda@email.hu"
            autoComplete="email"
            {...register("email")}
            aria-invalid={!!errors.email}
            disabled={isLoading}
          />
          {errors.email && (
            <p className="text-xs text-red-600 dark:text-red-400">
              {errors.email.message}
            </p>
          )}
        </div>

        {/* ── Password ─────────────────────────────────── */}
        <div className="space-y-1.5">
          <Label className="text-sm">
            <Lock className="size-4" />
            Jelszo
          </Label>
          <Input
            type="password"
            placeholder="Legalabb 6 karakter"
            autoComplete="new-password"
            {...register("password")}
            aria-invalid={!!errors.password}
            disabled={isLoading}
          />
          {errors.password && (
            <p className="text-xs text-red-600 dark:text-red-400">
              {errors.password.message}
            </p>
          )}
        </div>

        {/* ── Confirm password ─────────────────────────── */}
        <div className="space-y-1.5">
          <Label className="text-sm">
            <Lock className="size-4" />
            Jelszo megerositese
          </Label>
          <Input
            type="password"
            placeholder="Jelszo ujra"
            autoComplete="new-password"
            {...register("confirmPassword")}
            aria-invalid={!!errors.confirmPassword}
            disabled={isLoading}
          />
          {errors.confirmPassword && (
            <p className="text-xs text-red-600 dark:text-red-400">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        {/* ── Submit ───────────────────────────────────── */}
        <Button
          type="submit"
          className="w-full"
          size="lg"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-1.5 size-4 animate-spin" />
              Regisztracio...
            </>
          ) : (
            "Fiok letrehozasa"
          )}
        </Button>
      </form>

      {/* ── Login link ─────────────────────────────────── */}
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Mar van fiokod?{" "}
        <Link
          href="/login"
          className="font-medium text-foreground underline underline-offset-2 transition-colors hover:text-foreground/70"
        >
          Bejelentkezes
        </Link>
      </p>
    </div>
  );
}
