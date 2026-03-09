"use client";

/* ------------------------------------------------------------------ */
/*  Login form client component                                        */
/* ------------------------------------------------------------------ */

import { useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, Mail, Lock } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// ── Schema ─────────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email("Ervenytelen e-mail cim"),
  password: z.string().min(6, "A jelszo legalabb 6 karakter kell legyen"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

// ── Component ──────────────────────────────────────────────────────

export function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? "/";
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = useCallback(
    async (data: LoginFormValues) => {
      setIsLoading(true);

      try {
        const supabase = createClient();
        const { error } = await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        });

        if (error) {
          toast.error(
            error.message === "Invalid login credentials"
              ? "Hibas e-mail cim vagy jelszo."
              : error.message,
          );
          setIsLoading(false);
          return;
        }

        toast.success("Sikeres bejelentkezes!");
        router.push(redirectTo);
        router.refresh();
      } catch {
        toast.error("Varatlan hiba tortent. Kerlek, probald ujra.");
        setIsLoading(false);
      }
    },
    [router, redirectTo],
  );

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-[-0.02em]">
        Bejelentkezes
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Adja meg adatait a bejelentkezeshez.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
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
          <div className="flex items-center justify-between">
            <Label className="text-sm">
              <Lock className="size-4" />
              Jelszo
            </Label>
            <Link
              href="/reset-password"
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Elfelejtett jelszo?
            </Link>
          </div>
          <Input
            type="password"
            placeholder="Jelszo"
            autoComplete="current-password"
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
              Bejelentkezes...
            </>
          ) : (
            "Bejelentkezes"
          )}
        </Button>
      </form>

      {/* ── Register link ──────────────────────────────── */}
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Meg nincs fiokod?{" "}
        <Link
          href="/register"
          className="font-medium text-foreground underline underline-offset-2 transition-colors hover:text-foreground/70"
        >
          Regisztracio
        </Link>
      </p>
    </div>
  );
}
