import Link from "next/link";
import { siteConfig } from "@/lib/config/site.config";

/* ------------------------------------------------------------------ */
/*  Auth layout — minimal centered card, no header/footer navigation   */
/* ------------------------------------------------------------------ */

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-muted/40 flex min-h-screen flex-col items-center justify-center px-6 py-12">
      {/* Logo */}
      <Link
        href="/"
        className="mb-10 text-2xl font-semibold tracking-[-0.04em] transition-opacity duration-500 ease-out hover:opacity-70"
      >
        {siteConfig.branding.logoText}
      </Link>

      {/* Auth card */}
      <div className="border-border bg-background w-full max-w-[400px] rounded-xl border p-8 shadow-sm">
        {children}
      </div>

      {/* Back link */}
      <Link
        href="/"
        className="text-muted-foreground hover:text-foreground mt-8 text-xs transition-colors duration-300"
      >
        &larr; Vissza a boltba
      </Link>
    </div>
  );
}
