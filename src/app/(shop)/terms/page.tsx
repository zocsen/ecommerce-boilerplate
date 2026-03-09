import type { Metadata } from "next"
import { siteConfig } from "@/lib/config/site.config"

/* ------------------------------------------------------------------ */
/*  Terms & Conditions page (Hungarian)                                */
/* ------------------------------------------------------------------ */

export const metadata: Metadata = {
  title: "Általános Szerződési Feltételek",
  description: `${siteConfig.store.name} Általános Szerződési Feltételek (ÁSZF)`,
}

export default function TermsPage() {
  const { store } = siteConfig

  return (
    <article className="mx-auto max-w-3xl px-6 py-16 lg:py-24">
      <header className="mb-16">
        <h1 className="text-4xl font-bold tracking-tight lg:text-5xl">
          Általános Szerződési Feltételek
        </h1>
        <p className="mt-4 text-muted-foreground">
          Hatályos: 2024. január 1-től
        </p>
      </header>

      <div className="space-y-12 text-[15px] leading-relaxed text-foreground/80">
        {/* 1 */}
        <section>
          <h2 className="mb-4 text-xl font-semibold tracking-tight text-foreground">
            1. Üzemeltető adatai
          </h2>
          <p>
            Név: {store.legalName}
            <br />
            Székhely: {store.address}
            <br />
            E-mail: {store.email}
            <br />
            Telefon: {store.phone}
          </p>
        </section>

        {/* 2 */}
        <section>
          <h2 className="mb-4 text-xl font-semibold tracking-tight text-foreground">
            2. Általános rendelkezések
          </h2>
          <p>
            Jelen Általános Szerződési Feltételek (a továbbiakban: ÁSZF)
            tartalmazzák a {store.name} webáruház (a továbbiakban: Webáruház)
            használatára vonatkozó szabályokat. A Webáruház használatával a
            Felhasználó elfogadja az ÁSZF rendelkezéseit.
          </p>
          <p className="mt-3">
            A Webáruház üzemeltetője fenntartja a jogot a jelen ÁSZF
            egyoldalú módosítására. A módosításokról a Felhasználókat a
            Webáruházban elhelyezett tájékoztató útján értesíti.
          </p>
        </section>

        {/* 3 */}
        <section>
          <h2 className="mb-4 text-xl font-semibold tracking-tight text-foreground">
            3. Megrendelés menete
          </h2>
          <p>
            A Felhasználó a termékeket a Webáruház kínálatából választhatja
            ki. A kiválasztott termékek a kosárba helyezhetők, ahol a
            mennyiség módosítható. A megrendelés a pénztár oldalon, a
            szállítási és számlázási adatok megadása, valamint a fizetési mód
            kiválasztása után véglegesíthető.
          </p>
          <p className="mt-3">
            A megrendelés leadása ajánlattételnek minősül, amelyet az
            Üzemeltető a megrendelés visszaigazolásával fogad el. A szerződés
            a visszaigazolás Felhasználó általi kézhezvételével jön létre.
          </p>
        </section>

        {/* 4 */}
        <section>
          <h2 className="mb-4 text-xl font-semibold tracking-tight text-foreground">
            4. Árak és fizetés
          </h2>
          <p>
            Az árak magyar forintban (HUF) értendők és tartalmazzák az
            általános forgalmi adót (ÁFA). Az Üzemeltető fenntartja a jogot
            az árak előzetes értesítés nélküli módosítására, amely a már
            leadott megrendeléseket nem érinti.
          </p>
          <p className="mt-3">
            A fizetés a Barion rendszerén keresztül, online bankkártyás
            fizetéssel történik. A fizetés biztonságos, a kártyaadatokat a
            Barion kezeli, az Üzemeltető azokhoz nem fér hozzá.
          </p>
        </section>

        {/* 5 */}
        <section>
          <h2 className="mb-4 text-xl font-semibold tracking-tight text-foreground">
            5. Szállítás
          </h2>
          <p>
            A megrendelt termékek kiszállítása Magyarország területén belül
            történik. A szállítási díjakat a pénztár oldalon, a szállítási mód
            kiválasztásakor tüntetjük fel. Meghatározott rendelési érték
            felett a szállítás ingyenes.
          </p>
          <p className="mt-3">
            A szállítási idő általában 1-5 munkanap, amely a megrendelés
            visszaigazolását követő első munkanapon kezdődik.
          </p>
        </section>

        {/* 6 */}
        <section>
          <h2 className="mb-4 text-xl font-semibold tracking-tight text-foreground">
            6. Elállási jog
          </h2>
          <p>
            A 45/2014. (II. 26.) Korm. rendelet alapján a Felhasználó a
            termék átvételétől számított 14 napon belül indoklás nélkül
            elállhat a vásárlástól. Az elállási szándékot írásban (e-mailben
            vagy postai úton) kell közölni az Üzemeltetővel.
          </p>
          <p className="mt-3">
            Az elállás esetén az Üzemeltető a termék visszaérkezését követő
            14 napon belül visszatéríti a vételárat, beleértve a szállítási
            költséget is. A visszaküldés költségei a Felhasználót terhelik.
          </p>
        </section>

        {/* 7 */}
        <section>
          <h2 className="mb-4 text-xl font-semibold tracking-tight text-foreground">
            7. Szavatosság és jótállás
          </h2>
          <p>
            Az Üzemeltető szavatossági felelőssége a Ptk. (2013. évi V.
            törvény) rendelkezései szerint alakul. A Felhasználó a
            hibás teljesítés esetén szavatossági igényt érvényesíthet.
          </p>
        </section>

        {/* 8 */}
        <section>
          <h2 className="mb-4 text-xl font-semibold tracking-tight text-foreground">
            8. Panaszkezelés
          </h2>
          <p>
            A Felhasználó panaszait az Üzemeltető a {store.email} e-mail
            címen vagy a {store.phone} telefonszámon fogadja. A panasz
            benyújtásától számított 30 napon belül írásban válaszolunk.
          </p>
          <p className="mt-3">
            Amennyiben a panasz rendezése nem vezet eredményre, a Felhasználó
            a lakóhelye szerint illetékes Békéltető Testülethez fordulhat.
          </p>
        </section>

        {/* 9 */}
        <section>
          <h2 className="mb-4 text-xl font-semibold tracking-tight text-foreground">
            9. Záró rendelkezések
          </h2>
          <p>
            A jelen ÁSZF-ben nem szabályozott kérdésekben a magyar jog, különösen
            a Polgári Törvénykönyvről szóló 2013. évi V. törvény, az
            elektronikus kereskedelmi szolgáltatások egyes kérdéseiről szóló
            2001. évi CVIII. törvény, valamint a fogyasztó és a vállalkozás
            közötti szerződések részletes szabályairól szóló 45/2014. (II.
            26.) Korm. rendelet rendelkezései az irányadók.
          </p>
        </section>
      </div>
    </article>
  )
}
