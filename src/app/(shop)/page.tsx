import Link from "next/link"
import type { Metadata } from "next"
import { ArrowRight } from "lucide-react"
import { siteConfig } from "@/lib/config/site.config"
import { listProducts } from "@/lib/actions/products"
import { listCategories } from "@/lib/actions/categories"
import { ProductGrid } from "@/components/product/product-grid"
import { NewsletterForm } from "@/components/shared/newsletter-form"

/* ------------------------------------------------------------------ */
/*  Home page — brand intro, featured categories, products, CTA        */
/* ------------------------------------------------------------------ */

export const metadata: Metadata = {
  title: `${siteConfig.store.name} — Prémium webáruház`,
  description:
    "Fedezd fel prémium termékkínálatunkat. Magyar kézzel készített, kiváló minőségű termékek széles választéka.",
  openGraph: {
    title: `${siteConfig.store.name} — Prémium webáruház`,
    description:
      "Fedezd fel prémium termékkínálatunkat. Magyar kézzel készített, kiváló minőségű termékek széles választéka.",
    url: siteConfig.urls.siteUrl,
  },
}

export default async function HomePage() {
  const [categoriesResult, productsResult] = await Promise.all([
    listCategories(),
    listProducts({ sort: "newest", perPage: 8 }),
  ])

  const categories = categoriesResult.data ?? []
  const products = productsResult.data?.products ?? []

  // Show top-level categories only (no parent), limit to 6
  const featuredCategories = categories
    .filter((c) => c.parent_id === null)
    .slice(0, 6)

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-6 pb-24 pt-32 lg:px-8 lg:pb-32 lg:pt-48">
          <div className="max-w-3xl">
            <h1 className="text-5xl font-semibold leading-[1.08] tracking-[-0.04em] text-foreground sm:text-6xl lg:text-8xl">
              Prémium minőség,
              <br />
              <span className="text-muted-foreground">magyar kézzel.</span>
            </h1>
            <p className="mt-8 max-w-lg text-lg leading-relaxed text-muted-foreground lg:text-xl">
              Válogass gondosan összeállított kollekcióinkból. Minden termékünk a
              részletekre való odafigyeléssel és szenvedéllyel készül.
            </p>
            <Link
              href="/products"
              className="group mt-10 inline-flex items-center gap-3 text-sm font-medium uppercase tracking-[0.15em] text-foreground transition-all duration-500 hover:gap-5"
            >
              Fedezd fel a kínálatot
              <ArrowRight className="size-4 transition-transform duration-500 group-hover:translate-x-1" />
            </Link>
          </div>
        </div>

        {/* Subtle decorative gradient */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-32 -top-32 h-[600px] w-[600px] rounded-full bg-gradient-to-br from-muted/80 to-transparent blur-3xl"
        />
      </section>

      {/* ── Featured categories ──────────────────────────── */}
      {featuredCategories.length > 0 && (
        <section className="border-t border-border/40">
          <div className="mx-auto max-w-7xl px-6 py-24 lg:px-8 lg:py-32">
            <p className="mb-12 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Kategóriák
            </p>
            <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3">
              {featuredCategories.map((category) => (
                <Link
                  key={category.id}
                  href={`/products?category=${category.slug}`}
                  className="group flex items-baseline justify-between border-b border-border/40 py-6 transition-all duration-500 hover:pl-4"
                >
                  <span className="text-2xl font-medium tracking-[-0.02em] text-foreground transition-colors duration-500 group-hover:text-muted-foreground lg:text-3xl">
                    {category.name}
                  </span>
                  <ArrowRight className="size-5 text-muted-foreground/0 transition-all duration-500 group-hover:text-muted-foreground" />
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Featured products ────────────────────────────── */}
      {products.length > 0 && (
        <section className="border-t border-border/40">
          <div className="mx-auto max-w-7xl px-6 py-24 lg:px-8 lg:py-32">
            <div className="mb-12 flex items-end justify-between">
              <div>
                <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                  Újdonságok
                </p>
                <h2 className="text-3xl font-semibold tracking-[-0.03em] text-foreground lg:text-4xl">
                  Kiemelt termékek
                </h2>
              </div>
              <Link
                href="/products"
                className="group hidden items-center gap-2 text-sm font-medium text-muted-foreground transition-colors duration-300 hover:text-foreground sm:inline-flex"
              >
                Összes termék
                <ArrowRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
              </Link>
            </div>
            <ProductGrid products={products} />
            <div className="mt-10 text-center sm:hidden">
              <Link
                href="/products"
                className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Összes termék
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── Value props ──────────────────────────────────── */}
      <section className="border-t border-border/40 bg-muted/30">
        <div className="mx-auto max-w-7xl px-6 py-24 lg:px-8 lg:py-32">
          <div className="grid grid-cols-1 gap-16 md:grid-cols-3 md:gap-12">
            {VALUE_PROPS.map((prop) => (
              <div key={prop.number} className="flex flex-col">
                <span className="text-6xl font-semibold tracking-[-0.05em] text-border lg:text-7xl">
                  {prop.number}
                </span>
                <h3 className="mt-4 text-lg font-medium tracking-[-0.01em] text-foreground">
                  {prop.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {prop.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Newsletter CTA ───────────────────────────────── */}
      <section className="border-t border-border/40">
        <div className="mx-auto max-w-7xl px-6 py-24 lg:px-8 lg:py-32">
          <div className="mx-auto max-w-xl text-center">
            <h2 className="text-3xl font-semibold tracking-[-0.03em] text-foreground lg:text-4xl">
              Iratkozz fel hírlevelünkre
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Értesülj elsőként az újdonságokról, akcióinkról és exkluzív
              ajánlatainkról.
            </p>
            <div className="mt-8 flex justify-center">
              <NewsletterForm />
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

/* ------------------------------------------------------------------ */
/*  Static data                                                        */
/* ------------------------------------------------------------------ */

const VALUE_PROPS = [
  {
    number: "01",
    title: "Prémium alapanyagok",
    description:
      "Minden termékünk gondosan válogatott, kiváló minőségű alapanyagokból készül, amelyek tartósságot és elegáns megjelenést biztosítanak.",
  },
  {
    number: "02",
    title: "Gyors szállítás",
    description:
      "Rendelésed 1-3 munkanapon belül kézbesítjük az egész ország területén. Ingyenes szállítás meghatározott rendelési érték felett.",
  },
  {
    number: "03",
    title: "Egyszerű visszaküldés",
    description:
      "14 napos visszaküldési garancia minden termékünkre. Probléma esetén gyorsan és kényelmesen intézzük az ügyedet.",
  },
] as const
