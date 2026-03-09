"use client";

/* ------------------------------------------------------------------ */
/*  Register page — OAuth-first, collapsible email+password section    */
/* ------------------------------------------------------------------ */

import { useState, useCallback } from "react";
import Link from "next/link";
import {
  Loader2,
  Mail,
  Lock,
  User,
  CheckCircle2,
  ChevronDown,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { DevProfileSelector } from "@/components/auth/dev-profile-selector";

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

// ── OAuth providers ───────────────────────────────────────────────

type OAuthProvider = "google" | "apple" | "facebook";

const OAUTH_PROVIDERS: {
  id: OAuthProvider;
  label: string;
  icon: React.ReactNode;
}[] = [
  {
    id: "google",
    label: "Google",
    icon: (
      <svg viewBox="0 0 24 24" className="size-5" fill="currentColor">
        <path
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
          fill="#4285F4"
        />
        <path
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          fill="#34A853"
        />
        <path
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          fill="#FBBC05"
        />
        <path
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          fill="#EA4335"
        />
      </svg>
    ),
  },
  {
    id: "apple",
    label: "Apple",
    icon: (
      <svg viewBox="0 0 24 24" className="size-5" fill="currentColor">
        <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.32 2.32-2.11 4.45-3.74 4.25z" />
      </svg>
    ),
  },
  {
    id: "facebook",
    label: "Facebook",
    icon: (
      <svg viewBox="0 0 24 24" className="size-5" fill="#1877F2">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
];

// ── Component ──────────────────────────────────────────────────────

export default function RegisterPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<OAuthProvider | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);

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

  // ── OAuth handler ──────────────────────────────────────────────

  const handleOAuth = useCallback(async (provider: OAuthProvider) => {
    setOauthLoading(provider);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/`,
        },
      });

      if (error) {
        toast.error(
          `A ${provider} regisztracio nem sikerult. Ellenorizd, hogy a provider konfiguralt-e.`,
        );
        setOauthLoading(null);
      }
    } catch {
      toast.error("Varatlan hiba tortent. Probald ujra.");
      setOauthLoading(null);
    }
  }, []);

  // ── Email+password handler ─────────────────────────────────────

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

      {/* ── OAuth buttons ──────────────────────────────── */}
      <div className="mt-6 space-y-2.5">
        {OAUTH_PROVIDERS.map(({ id, label, icon }) => (
          <Button
            key={id}
            type="button"
            variant="outline"
            size="lg"
            className="w-full justify-center gap-3 font-medium"
            disabled={oauthLoading !== null || isLoading}
            onClick={() => handleOAuth(id)}
          >
            {oauthLoading === id ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              icon
            )}
            Tovabb ezzel: {label}
          </Button>
        ))}
      </div>

      {/* ── Divider ────────────────────────────────────── */}
      <div className="relative my-6 flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground select-none">vagy</span>
        <Separator className="flex-1" />
      </div>

      {/* ── Email toggle ───────────────────────────────── */}
      <button
        type="button"
        onClick={() => setShowEmailForm((prev) => !prev)}
        className="flex w-full items-center justify-center gap-1.5 text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground"
      >
        <Mail className="size-3.5" />
        E-mail cimmel
        <ChevronDown
          className={`size-3.5 transition-transform duration-300 ${showEmailForm ? "rotate-180" : ""}`}
        />
      </button>

      {/* ── Collapsible email form ─────────────────────── */}
      <div
        className={`grid transition-all duration-300 ease-out ${
          showEmailForm
            ? "mt-4 grid-rows-[1fr] opacity-100"
            : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* ── Full name ─────────────────────────────── */}
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

            {/* ── Email ─────────────────────────────────── */}
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

            {/* ── Password ──────────────────────────────── */}
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

            {/* ── Confirm password ──────────────────────── */}
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

            {/* ── Submit ────────────────────────────────── */}
            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={isLoading || oauthLoading !== null}
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
        </div>
      </div>

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

      {/* ── Dev quick login ────────────────────────────── */}
      <DevProfileSelector />
    </div>
  );
}
