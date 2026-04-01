import type { Metadata } from "next";
import { siteConfig } from "@/lib/config/site.config";
import { getAvailableCarriers } from "@/lib/utils/shipping";
import { formatHUF } from "@/lib/utils/format";

/* ------------------------------------------------------------------ */
/*  Shipping & Returns page (Hungarian)                                */
/* ------------------------------------------------------------------ */

export const metadata: Metadata = {
  title: "Szállítás és Visszaküldés",
  description: `${siteConfig.store.name} — Szállítási feltételek és visszaküldési szabályzat`,
};

export default function ShippingAndReturnsPage() {
  const { store, shipping } = siteConfig;
  const homeCarriers = getAvailableCarriers("home");
  const pickupCarriers = getAvailableCarriers("pickup");

  return (
    <article className="mx-auto max-w-3xl px-6 py-16 lg:py-24">
      <header className="mb-16">
        <h1 className="text-4xl font-bold tracking-tight lg:text-5xl">Szállítás és Visszaküldés</h1>
        <p className="text-muted-foreground mt-4">
          Minden tudnivaló a szállítási lehetőségekről és a visszaküldési feltételekről.
        </p>
      </header>

      <div className="text-foreground/80 space-y-12 text-[15px] leading-relaxed">
        {/* Shipping */}
        <section>
          <h2 className="text-foreground mb-4 text-xl font-semibold tracking-tight">
            Szállítási feltételek
          </h2>
          <p>
            A megrendelt termékek kiszállítása kizárólag Magyarország területére történik. A
            szállítási idő általában 1–5 munkanap.
          </p>

          {shipping.rules.freeOver > 0 && (
            <p className="text-foreground mt-3 font-medium">
              {formatHUF(shipping.rules.freeOver)} feletti rendelés esetén a szállítás ingyenes!
            </p>
          )}
        </section>

        {/* Home delivery */}
        {shipping.methods.homeDelivery && homeCarriers.length > 0 && (
          <section>
            <h2 className="text-foreground mb-4 text-xl font-semibold tracking-tight">
              Házhozszállítás
            </h2>
            <p className="mb-4">Az alábbi futárszolgálatok közül választhatsz:</p>
            <div className="overflow-hidden rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b">
                    <th className="text-foreground px-4 py-3 text-left font-medium">
                      Futárszolgálat
                    </th>
                    <th className="text-foreground px-4 py-3 text-right font-medium">Díj</th>
                  </tr>
                </thead>
                <tbody>
                  {homeCarriers.map((carrier) => (
                    <tr key={carrier.id} className="border-b last:border-0">
                      <td className="px-4 py-3">{carrier.name}</td>
                      <td className="px-4 py-3 text-right font-medium">{formatHUF(carrier.fee)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Pickup points */}
        {shipping.methods.pickupPoint && pickupCarriers.length > 0 && (
          <section>
            <h2 className="text-foreground mb-4 text-xl font-semibold tracking-tight">
              Csomagautomata / Átvételi pont
            </h2>
            <p className="mb-4">
              A rendelésedet csomagautomatába vagy átvételi pontra is kérheted:
            </p>
            <div className="overflow-hidden rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b">
                    <th className="text-foreground px-4 py-3 text-left font-medium">Szolgáltató</th>
                    <th className="text-foreground px-4 py-3 text-right font-medium">Díj</th>
                  </tr>
                </thead>
                <tbody>
                  {pickupCarriers.map((carrier) => (
                    <tr key={carrier.id} className="border-b last:border-0">
                      <td className="px-4 py-3">{carrier.name}</td>
                      <td className="px-4 py-3 text-right font-medium">{formatHUF(carrier.fee)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Returns */}
        <section>
          <h2 className="text-foreground mb-4 text-xl font-semibold tracking-tight">
            Visszaküldési feltételek
          </h2>
          <p>
            A 45/2014. (II. 26.) Korm. rendelet alapján a termék kézhezvételétől számított{" "}
            <strong>14 napon belül</strong> indoklás nélkül elállhatsz a vásárlástól.
          </p>

          <h3 className="text-foreground mt-6 mb-2 text-base font-semibold">Visszaküldés menete</h3>
          <ol className="ml-5 list-decimal space-y-2">
            <li>
              Jelezd elállási szándékodat e-mailben a{" "}
              <span className="text-foreground font-medium">{store.email}</span> címen.
            </li>
            <li>
              A terméket az eredeti csomagolásban, használatlan állapotban küldd vissza az alábbi
              címre: <span className="text-foreground font-medium">{store.address}</span>
            </li>
            <li>
              A csomag beérkezését követő 14 napon belül visszautaljuk a vételárat az eredeti
              fizetési módra.
            </li>
          </ol>

          <h3 className="text-foreground mt-6 mb-2 text-base font-semibold">
            Nem visszaküldhető termékek
          </h3>
          <ul className="ml-5 list-disc space-y-1.5">
            <li>Az érintett kérésére személyre szabott vagy átalakított termékek</li>
            <li>
              Olyan zárt csomagolású termékek, amelyek egészségvédelmi vagy higiéniai okból nem
              küldhetők vissza
            </li>
          </ul>
        </section>

        {/* Warranty */}
        <section>
          <h2 className="text-foreground mb-4 text-xl font-semibold tracking-tight">Garancia</h2>
          <p>
            A termékekre a Ptk. (2013. évi V. törvény) szerinti szavatossági jogok vonatkoznak.
            Hibás termék esetén kérjük, vedd fel velünk a kapcsolatot a{" "}
            <span className="text-foreground font-medium">{store.email}</span> e-mail címen.
          </p>
        </section>

        {/* Contact */}
        <section>
          <h2 className="text-foreground mb-4 text-xl font-semibold tracking-tight">Kapcsolat</h2>
          <p>Kérdés esetén keress minket bizalommal:</p>
          <p className="mt-2">
            E-mail: <span className="text-foreground font-medium">{store.email}</span>
            <br />
            Telefon: <span className="text-foreground font-medium">{store.phone}</span>
          </p>
        </section>
      </div>
    </article>
  );
}
