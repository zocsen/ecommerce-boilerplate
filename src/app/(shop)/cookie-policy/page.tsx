import type { Metadata } from "next";
import { siteConfig } from "@/lib/config/site.config";

/* ------------------------------------------------------------------ */
/*  Cookie Policy page (Hungarian)                                     */
/* ------------------------------------------------------------------ */

export const metadata: Metadata = {
  title: "Cookie (Süti) Szabályzat",
  description: `${siteConfig.store.name} Cookie (Süti) Szabályzat`,
};

/* ── Cookie table data ──────────────────────────────────────────── */

interface CookieEntry {
  name: string;
  purpose: string;
  category: "Szükséges" | "Analitika" | "Marketing";
  duration: string;
  provider: string;
}

const cookies: CookieEntry[] = [
  {
    name: "cookie_consent",
    purpose: "A látogató süti-hozzájárulási beállításainak tárolása.",
    category: "Szükséges",
    duration: "365 nap",
    provider: siteConfig.store.name,
  },
  {
    name: "sb-*-auth-token",
    purpose: "Felhasználói munkamenet azonosítása bejelentkezés után (Supabase Auth).",
    category: "Szükséges",
    duration: "Munkamenet / 1 év",
    provider: "Supabase",
  },
  {
    name: "cart-storage",
    purpose: "A kosár tartalmának megőrzése az oldalak között (localStorage).",
    category: "Szükséges",
    duration: "Állandó (amíg a felhasználó nem törli)",
    provider: siteConfig.store.name,
  },
  {
    name: "_ga, _ga_*",
    purpose: "Látogatói statisztikák gyűjtése a Google Analytics 4 segítségével.",
    category: "Analitika",
    duration: "2 év",
    provider: "Google",
  },
  {
    name: "_gid",
    purpose: "Egyedi látogató azonosítása 24 órás időszakon belül.",
    category: "Analitika",
    duration: "24 óra",
    provider: "Google",
  },
  {
    name: "_fbp",
    purpose: "Facebook hirdetések hatékonyságának mérése.",
    category: "Marketing",
    duration: "3 hónap",
    provider: "Meta (Facebook)",
  },
  {
    name: "_fbc",
    purpose: "Facebook kattintás-azonosító hirdetési konverziók követéséhez.",
    category: "Marketing",
    duration: "3 hónap",
    provider: "Meta (Facebook)",
  },
];

/* ── Page ────────────────────────────────────────────────────────── */

export default function CookiePolicyPage() {
  const { store } = siteConfig;

  return (
    <article className="mx-auto max-w-3xl px-6 py-16 lg:py-24">
      <header className="mb-16">
        <h1 className="text-4xl font-bold tracking-tight lg:text-5xl">Cookie (Süti) Szabályzat</h1>
        <p className="mt-4 text-muted-foreground">Hatályos: 2024. január 1-től</p>
      </header>

      <div className="space-y-12 text-[15px] leading-relaxed text-foreground/80">
        {/* 1 — Bevezetés */}
        <section>
          <h2 className="mb-4 text-xl font-semibold tracking-tight text-foreground">
            1. Bevezetés
          </h2>
          <p>
            A {store.name} ({store.legalName}, székhely: {store.address}) weboldalán sütiket
            (cookie-kat) használunk a weboldal megfelelő működésének biztosítása, a felhasználói
            élmény javítása és — hozzájárulás esetén — statisztikai és marketing célok érdekében.
          </p>
          <p className="mt-3">
            Ez a szabályzat az Európai Parlament és a Tanács 2002/58/EK irányelve (ePrivacy
            irányelv), valamint az (EU) 2016/679 rendelet (GDPR) alapján készült.
          </p>
        </section>

        {/* 2 — Mi az a süti? */}
        <section>
          <h2 className="mb-4 text-xl font-semibold tracking-tight text-foreground">
            2. Mi az a süti (cookie)?
          </h2>
          <p>
            A süti egy kis szöveges fájl, amelyet a weboldal a látogató böngészőjében tárol. A sütik
            lehetővé teszik, hogy a weboldal megjegyezze a látogató beállításait, és személyre
            szabott élményt nyújtson.
          </p>
        </section>

        {/* 3 — Kategóriák */}
        <section>
          <h2 className="mb-4 text-xl font-semibold tracking-tight text-foreground">
            3. Süti kategóriák
          </h2>

          <div className="mt-6 space-y-6">
            <div>
              <h3 className="font-semibold text-foreground">Szükséges sütik</h3>
              <p className="mt-1">
                Ezek a sütik elengedhetetlenek a weboldal alapvető funkcióinak működéséhez. Ide
                tartozik a munkamenet kezelése, a kosár tartalma és a süti-hozzájárulás megjegyzése.
                Ezek a sütik nem igényelnek hozzájárulást.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-foreground">Analitikai sütik</h3>
              <p className="mt-1">
                Ezek a sütik segítenek megérteni, hogyan használják a látogatók a weboldalt (pl.
                melyik oldalak a legnépszerűbbek, honnan érkeznek a látogatók). Az összegyűjtött
                adatok anonimizáltak. Csak a látogató hozzájárulása után aktiválódnak.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-foreground">Marketing sütik</h3>
              <p className="mt-1">
                Ezek a sütik lehetővé teszik személyre szabott hirdetések megjelenítését a látogató
                érdeklődése alapján, valamint hirdetési kampányok hatékonyságának mérését. Csak a
                látogató hozzájárulása után aktiválódnak.
              </p>
            </div>
          </div>
        </section>

        {/* 4 — Süti táblázat */}
        <section>
          <h2 className="mb-4 text-xl font-semibold tracking-tight text-foreground">
            4. Használt sütik
          </h2>
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-3 pr-4 font-semibold text-foreground">Süti neve</th>
                  <th className="pb-3 pr-4 font-semibold text-foreground">Cél</th>
                  <th className="pb-3 pr-4 font-semibold text-foreground">Kategória</th>
                  <th className="pb-3 pr-4 font-semibold text-foreground">Időtartam</th>
                  <th className="pb-3 font-semibold text-foreground">Szolgáltató</th>
                </tr>
              </thead>
              <tbody>
                {cookies.map((cookie) => (
                  <tr key={cookie.name} className="border-b border-border/50">
                    <td className="py-3 pr-4 font-mono text-xs">{cookie.name}</td>
                    <td className="py-3 pr-4">{cookie.purpose}</td>
                    <td className="py-3 pr-4 whitespace-nowrap">{cookie.category}</td>
                    <td className="py-3 pr-4 whitespace-nowrap">{cookie.duration}</td>
                    <td className="py-3 whitespace-nowrap">{cookie.provider}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 5 — Hozzájárulás kezelése */}
        <section>
          <h2 className="mb-4 text-xl font-semibold tracking-tight text-foreground">
            5. Hozzájárulás kezelése
          </h2>
          <p>
            Az első látogatáskor egy süti-banner jelenik meg, ahol kiválaszthatja, mely kategóriájú
            sütiket fogadja el. A beállításokat bármikor módosíthatja az oldal láblécében található
            &ldquo;Cookie beállítások&rdquo; linkre kattintva.
          </p>
          <p className="mt-3">
            A szükséges sütik mindig aktívak, mert a weboldal működéséhez elengedhetetlenek. Az
            analitikai és marketing sütiket csak a látogató kifejezett hozzájárulásával aktiváljuk.
          </p>
        </section>

        {/* 6 — Sütik törlése */}
        <section>
          <h2 className="mb-4 text-xl font-semibold tracking-tight text-foreground">
            6. Sütik törlése
          </h2>
          <p>
            A sütik a böngésző beállításain keresztül bármikor törölhetők. A törlés után a
            süti-banner újra megjelenik, és a nem szükséges sütik nem töltődnek be a hozzájárulás
            megújításáig.
          </p>
        </section>

        {/* 7 — Kapcsolat */}
        <section>
          <h2 className="mb-4 text-xl font-semibold tracking-tight text-foreground">
            7. Kapcsolat
          </h2>
          <p>A sütikkel kapcsolatos kérdéseit az alábbi elérhetőségen teheti fel:</p>
          <p className="mt-3">
            {store.legalName}
            <br />
            {store.address}
            <br />
            E-mail:{" "}
            <a
              href={`mailto:${store.email}`}
              className="underline underline-offset-2 transition-colors hover:text-foreground"
            >
              {store.email}
            </a>
            <br />
            Telefon:{" "}
            <a
              href={`tel:${store.phone.replace(/\s/g, "")}`}
              className="underline underline-offset-2 transition-colors hover:text-foreground"
            >
              {store.phone}
            </a>
          </p>
        </section>
      </div>
    </article>
  );
}
