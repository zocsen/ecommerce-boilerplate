"use client";

import { useState, type FormEvent } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowRight, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { subscribe } from "@/lib/actions/subscribers";

type FormStatus = "idle" | "loading" | "success" | "error";

/**
 * Inline newsletter signup form.
 * Client component — handles form state and submission.
 */
export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<FormStatus>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!email.trim()) return;

    setStatus("loading");
    setErrorMsg(null);

    try {
      const result = await subscribe(email.trim(), "newsletter_footer");

      if (!result.success) {
        setStatus("error");
        setErrorMsg(result.error ?? "Hiba a feliratkozáskor.");
        return;
      }

      setStatus("success");
      setEmail("");
    } catch {
      setStatus("error");
      setErrorMsg("Váratlan hiba történt.");
    }
  }

  return (
    <div className="w-full max-w-sm space-y-1.5">
      <form onSubmit={handleSubmit} className="flex w-full items-center gap-2">
        <Input
          type="email"
          placeholder="email@pelda.hu"
          required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (status !== "idle") {
              setStatus("idle");
              setErrorMsg(null);
            }
          }}
          disabled={status === "loading"}
          className={cn("h-9 flex-1", status === "error" && "border-destructive")}
          aria-label="Email cím"
        />
        <Button
          type="submit"
          size="sm"
          disabled={status === "loading"}
          className="h-9 gap-1.5 px-4"
        >
          {status === "loading" && <Loader2 className="size-3.5 animate-spin" />}
          {status === "success" && <Check className="size-3.5" />}
          {status === "idle" && <ArrowRight className="size-3.5" />}
          {status === "error" && <ArrowRight className="size-3.5" />}
          <span className="sr-only sm:not-sr-only">
            {status === "success" ? "Feliratkozva" : "Feliratkozás"}
          </span>
        </Button>
      </form>
      {status === "error" && errorMsg && <p className="text-destructive text-xs">{errorMsg}</p>}
    </div>
  );
}
