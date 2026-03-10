"use client";

/* ------------------------------------------------------------------ */
/*  Reset password page                                                */
/* ------------------------------------------------------------------ */

import { useState, useCallback } from "react";
import Link from "next/link";
import { Loader2, Mail, CheckCircle2, ArrowLeft } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// ── Schema ─────────────────────────────────────────────────────────

const resetSchema = z.object({
  email: z.string().email("Érvénytelen e-mail cím"),
});

type ResetFormValues = z.infer<typeof resetSchema>;

// ── Component ──────────────────────────────────────────────────────

export default function ResetPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = useCallback(async (data: ResetFormValues) => {
    setIsLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/account`,
      });

      if (error) {
        toast.error(error.message);
        setIsLoading(false);
        return;
      }

      setIsSuccess(true);
    } catch {
      toast.error("Váratlan hiba történt. Kérlek, próbáld újra.");
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
          E-mail elküldve
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Ha ez az e-mail cím regisztrált nálunk, hamarosan kapsz egy linket a
          jelszó visszaállításához.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-foreground underline underline-offset-2 transition-colors hover:text-foreground/70"
        >
          <ArrowLeft className="size-3.5" />
          Vissza a bejelentkezéshez
        </Link>
      </div>
    );
  }

  // ── Form ─────────────────────────────────────────────────────────

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-[-0.02em]">
        Jelszó visszaállítása
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Adja meg az e-mail címét, és küldünk egy linket a jelszó
        visszaállításához.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
        {/* ── Email ────────────────────────────────────── */}
        <div className="space-y-1.5">
          <Label className="text-sm">
            <Mail className="size-4" />
            E-mail cím
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
              Küldés...
            </>
          ) : (
            "Visszaállító link küldése"
          )}
        </Button>
      </form>

      {/* ── Back to login ──────────────────────────────── */}
      <p className="mt-6 text-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Vissza a bejelentkezéshez
        </Link>
      </p>
    </div>
  );
}
