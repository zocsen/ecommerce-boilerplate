import type { Metadata } from "next"
import { siteConfig } from "@/lib/config/site.config"

/* ------------------------------------------------------------------ */
/*  Privacy Policy page (Hungarian)                                    */
/* ------------------------------------------------------------------ */

export const metadata: Metadata = {
  title: "Adatvédelmi Tájékoztató",
  description: `${siteConfig.store.name} Adatvédelmi Tájékoztató`,
}

export default function PrivacyPage() {
  const { store } = siteConfig

  return (
    <article className="mx-auto max-w-3xl px-6 py-16 lg:py-24">
      <header className="mb-16">
        <h1 className="text-4xl font-bold tracking-tight lg:text-5xl">
          Adatvédelmi Tájékoztató
        </h1>
        <p className="mt-4 text-muted-foreground">
          Hatályos: 2024. január 1-től
        </p>
      </header>

      <div className="space-y-12 text-[15px] leading-relaxed text-foreground/80">
        {/* 1 */}
        <section>
          <h2 className="mb-4 text-xl font-semibold tracking-tight text-foreground">
            1. Adatkezelő
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
            2. Az adatkezelés jogalapja
          </h2>
          <p>
            Az adatkezelés az Európai Parlament és a Tanács (EU) 2016/679
            rendelete (GDPR), valamint az információs önrendelkezési jogról
            és az információszabadságról szóló 2011. évi CXII. törvény
            rendelkezései alapján történik.
          </p>
          <p className="mt-3">
            A személyes adatok kezelésének jogalapja a Felhasználó önkéntes
            hozzájárulása, valamint a szerződés teljesítéséhez szükséges
            adatkezelés (GDPR 6. cikk (1) bekezdés a) és b) pontja).
          </p>
        </section>

        {/* 3 */}
        <section>
          <h2 className="mb-4 text-xl font-semibold tracking-tight text-foreground">
            3. Kezelt személyes adatok köre
          </h2>
          <ul className="ml-5 mt-2 list-disc space-y-1.5">
            <li>
              <strong>Regisztráció:</strong> teljes név, e-mail cím,
              telefonszám
            </li>
            <li>
              <strong>Vásárlás:</strong> számlázási és szállítási cím,
              e-mail, telefonszám
            </li>
            <li>
              <strong>Hírlevél feliratkozás:</strong> e-mail cím
            </li>
            <li>
              <strong>Technikai adatok:</strong> IP-cím, böngésző típusa,
              látogatási idő (cookie-kon keresztül)
            </li>
          </ul>
        </section>

        {/* 4 */}
        <section>
          <h2 className="mb-4 text-xl font-semibold tracking-tight text-foreground">
            4. Az adatkezelés célja
          </h2>
          <ul className="ml-5 mt-2 list-disc space-y-1.5">
            <li>Megrendelések teljesítése és kapcsolattartás</li>
            <li>Számla kiállítása (jogszabályi kötelezettség)</li>
            <li>Szállítás szervezése</li>
            <li>
              Hírlevél küldése (kizárólag az érintett hozzájárulása alapján)
            </li>
            <li>Webáruház működésének biztosítása és fejlesztése</li>
          </ul>
        </section>

        {/* 5 */}
        <section>
          <h2 className="mb-4 text-xl font-semibold tracking-tight text-foreground">
            5. Adatkezelés időtartama
          </h2>
          <p>
            A regisztrációs adatokat a felhasználói fiók törléséig tároljuk.
            A vásárlási adatokat a számviteli törvény alapján 8 évig őrizzük
            meg. A hírlevélre feliratkozottak adatait a leiratkozásig
            kezeljük.
          </p>
        </section>

        {/* 6 */}
        <section>
          <h2 className="mb-4 text-xl font-semibold tracking-tight text-foreground">
            6. Adattovábbítás
          </h2>
          <p>
            A személyes adatokat harmadik félnek kizárólag a megrendelés
            teljesítéséhez szükséges mértékben adjuk át:
          </p>
          <ul className="ml-5 mt-2 list-disc space-y-1.5">
            <li>
              <strong>Futárszolgálatok:</strong> szállítási cím, név,
              telefonszám
            </li>
            <li>
              <strong>Fizetési szolgáltató (Barion):</strong> a tranzakció
              feldolgozásához szükséges adatok
            </li>
            <li>
              <strong>Számlázó szolgáltató:</strong> a számla kiállításához
              szükséges adatok
            </li>
          </ul>
        </section>

        {/* 7 */}
        <section>
          <h2 className="mb-4 text-xl font-semibold tracking-tight text-foreground">
            7. Cookie-k (sütik)
          </h2>
          <p>
            A Webáruház sütiket használ a felhasználói élmény javítása és a
            webáruház működésének biztosítása érdekében. A sütik kis
            szöveges fájlok, amelyeket a böngésző tárol a felhasználó
            eszközén.
          </p>
          <ul className="ml-5 mt-3 list-disc space-y-1.5">
            <li>
              <strong>Szükséges sütik:</strong> a webáruház alapvető
              működéséhez (kosár, bejelentkezés)
            </li>
            <li>
              <strong>Teljesítmény sütik:</strong> az oldal teljesítményének
              mérése (opcionális)
            </li>
          </ul>
        </section>

        {/* 8 */}
        <section>
          <h2 className="mb-4 text-xl font-semibold tracking-tight text-foreground">
            8. Az érintett jogai
          </h2>
          <p>
            A Felhasználó az alábbi jogokkal élhet a személyes adatai
            tekintetében:
          </p>
          <ul className="ml-5 mt-2 list-disc space-y-1.5">
            <li>Hozzáférés joga (tájékoztatás kérése a kezelt adatokról)</li>
            <li>Helyesbítés joga (pontatlan adatok kijavítása)</li>
            <li>Törlés joga (&bdquo;elfeledtetés&rdquo;)</li>
            <li>Adatkezelés korlátozásának joga</li>
            <li>Adathordozhatóság joga</li>
            <li>Tiltakozás joga</li>
            <li>
              Hozzájárulás visszavonásának joga (pl. hírlevél leiratkozás)
            </li>
          </ul>
          <p className="mt-3">
            A fenti jogok gyakorlásával kapcsolatos kérelmeket a{" "}
            {store.email} e-mail címre küldhetők. A kérelemre 30 napon belül
            válaszolunk.
          </p>
        </section>

        {/* 9 */}
        <section>
          <h2 className="mb-4 text-xl font-semibold tracking-tight text-foreground">
            9. Jogorvoslat
          </h2>
          <p>
            Amennyiben a Felhasználó úgy véli, hogy személyes adatai
            kezelése jogszabálysértő, panasszal fordulhat a Nemzeti
            Adatvédelmi és Információszabadság Hatósághoz (NAIH):
          </p>
          <p className="mt-3">
            Székhely: 1055 Budapest, Falk Miksa utca 9-11.
            <br />
            Postacím: 1363 Budapest, Pf. 9.
            <br />
            Telefon: +36 1 391 1400
            <br />
            E-mail: ugyfelszolgalat@naih.hu
            <br />
            Honlap: www.naih.hu
          </p>
        </section>

        {/* 10 */}
        <section>
          <h2 className="mb-4 text-xl font-semibold tracking-tight text-foreground">
            10. Adatbiztonság
          </h2>
          <p>
            Az Üzemeltető megfelelő technikai és szervezési intézkedésekkel
            gondoskodik a személyes adatok biztonságáról. Az adatokhoz
            kizárólag az arra jogosult személyek férhetnek hozzá, és azok
            titkosan kezelődnek.
          </p>
        </section>
      </div>
    </article>
  )
}
