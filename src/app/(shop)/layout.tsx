import { Header } from "@/components/shared/header";
import { Footer } from "@/components/shared/footer";

/* ------------------------------------------------------------------ */
/*  Shop layout — wraps all storefront pages with header + footer      */
/* ------------------------------------------------------------------ */

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
