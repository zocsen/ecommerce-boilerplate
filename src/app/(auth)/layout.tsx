import Link from "next/link";
import { siteConfig } from "@/lib/config/site.config";

/* ------------------------------------------------------------------ */
/*  Auth layout — minimal centered card, no header/footer navigation   */
/* ------------------------------------------------------------------ */

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 px-6 py-12">
      {/* Logo */}
      <Link
        href="/"
        className="mb-10 text-2xl font-semibold tracking-[-0.04em] transition-opacity duration-500 ease-out hover:opacity-70"
      >
        {siteConfig.branding.logoText}
      </Link>

      {/* Auth card */}
      <div className="w-full max-w-[400px] rounded-xl border border-border bg-background p-8 shadow-sm">
        {children}
      </div>

      {/* Back link */}
      <Link
        href="/"
        className="mt-8 text-xs text-muted-foreground transition-colors duration-300 hover:text-foreground"
      >
        &larr; Vissza a boltba
      </Link>
    </div>
  );
}
