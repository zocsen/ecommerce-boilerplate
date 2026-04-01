import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Mail, MapPin, Phone } from "lucide-react";
import { siteConfig } from "@/lib/config/site.config";
import { getPageContent } from "@/lib/actions/pages";
import type { AboutUsContent } from "@/lib/types/database";

/* ------------------------------------------------------------------ */
/*  About Us — public page (FE-023)                                    */
/*                                                                     */
/*  Renders structured sections: hero, story, team, values, contact.  */
/*  Sections with empty content are hidden.                            */
/* ------------------------------------------------------------------ */

export const metadata: Metadata = {
  title: `Rólunk — ${siteConfig.store.name}`,
  description: `Ismerj meg minket! A ${siteConfig.store.name} csapata, történetünk és értékeink.`,
};

export default async function AboutPage() {
  const result = await getPageContent("about");

  if (!result.success || !result.data) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-32 text-center lg:px-8">
        <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          Rólunk
        </h1>
        <p className="mx-auto mt-6 max-w-md text-lg text-muted-foreground">
          Ez az oldal hamarosan elérhető lesz.
        </p>
        <Link
          href="/"
          className="group mt-10 inline-flex items-center gap-3 text-sm font-medium uppercase tracking-[0.15em] text-foreground transition-all duration-500 hover:gap-5"
        >
          Vissza a főoldalra
          <ArrowRight className="size-4 transition-transform duration-500 group-hover:translate-x-1" />
        </Link>
      </div>
    );
  }

  const content = result.data.content;

  const hasHero = content.hero.title || content.hero.subtitle || content.hero.imageUrl;
  const hasStory = content.story.title || content.story.body;
  const hasTeam = content.team.length > 0;
  const hasValues = content.values.length > 0;
  const hasContact = content.contact.address || content.contact.phone || content.contact.email;

  return (
    <>
      {/* ── Hero Section ──────────────────────────────────── */}
      {hasHero && <HeroSection hero={content.hero} />}

      {/* ── Story Section ─────────────────────────────────── */}
      {hasStory && <StorySection story={content.story} />}

      {/* ── Team Section ──────────────────────────────────── */}
      {hasTeam && <TeamSection team={content.team} />}

      {/* ── Values Section ────────────────────────────────── */}
      {hasValues && <ValuesSection values={content.values} />}

      {/* ── Contact Section ───────────────────────────────── */}
      {hasContact && <ContactSection contact={content.contact} />}

      {/* ── Fallback if everything empty ──────────────────── */}
      {!hasHero && !hasStory && !hasTeam && !hasValues && !hasContact && (
        <div className="mx-auto max-w-7xl px-6 py-32 text-center lg:px-8">
          <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Rólunk
          </h1>
          <p className="mx-auto mt-6 max-w-md text-lg text-muted-foreground">Tartalom hamarosan.</p>
        </div>
      )}
    </>
  );
}

/* ================================================================== */
/*  Section components                                                 */
/* ================================================================== */

function HeroSection({ hero }: { hero: AboutUsContent["hero"] }) {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto max-w-7xl px-6 pb-24 pt-32 lg:px-8 lg:pb-32 lg:pt-48">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <h1 className="text-5xl font-semibold leading-[1.08] tracking-[-0.04em] text-foreground sm:text-6xl lg:text-7xl">
              {hero.title}
            </h1>
            {hero.subtitle && (
              <p className="mt-8 max-w-lg text-lg leading-relaxed text-muted-foreground lg:text-xl">
                {hero.subtitle}
              </p>
            )}
          </div>
          {hero.imageUrl && (
            <div className="relative overflow-hidden rounded-sm" style={{ aspectRatio: "4/3" }}>
              <Image
                src={hero.imageUrl}
                alt={hero.title || "Rólunk"}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority
                unoptimized={hero.imageUrl.startsWith("http://")}
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function StorySection({ story }: { story: AboutUsContent["story"] }) {
  return (
    <section className="border-t border-border">
      <div className="mx-auto max-w-7xl px-6 py-24 lg:px-8 lg:py-32">
        <div className="mx-auto max-w-3xl">
          {story.title && (
            <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              {story.title}
            </h2>
          )}
          {story.body && (
            <div className="mt-8 space-y-6 text-lg leading-relaxed text-muted-foreground whitespace-pre-line">
              {story.body}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function TeamSection({ team }: { team: AboutUsContent["team"] }) {
  return (
    <section className="border-t border-border bg-muted/30">
      <div className="mx-auto max-w-7xl px-6 py-24 lg:px-8 lg:py-32">
        <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Csapatunk
        </h2>
        <p className="mt-4 max-w-xl text-lg text-muted-foreground">
          Ismerd meg az embereket, akik a {siteConfig.store.name} mögött állnak.
        </p>

        <div className="mt-16 grid gap-12 sm:grid-cols-2 lg:grid-cols-3">
          {team.map((member, i) => (
            <div key={i} className="group">
              {member.imageUrl ? (
                <div className="relative overflow-hidden rounded-sm" style={{ aspectRatio: "3/4" }}>
                  <Image
                    src={member.imageUrl}
                    alt={member.name}
                    fill
                    className="object-cover transition-all duration-500 group-hover:scale-[1.02]"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    unoptimized={member.imageUrl.startsWith("http://")}
                  />
                </div>
              ) : (
                <div
                  className="flex items-center justify-center rounded-sm bg-muted"
                  style={{ aspectRatio: "3/4" }}
                >
                  <span className="text-6xl font-semibold tracking-tight text-muted-foreground/30">
                    {member.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-foreground">{member.name}</h3>
                {member.role && (
                  <p className="mt-1 text-sm font-medium uppercase tracking-[0.1em] text-muted-foreground">
                    {member.role}
                  </p>
                )}
                {member.bio && (
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{member.bio}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ValuesSection({ values }: { values: AboutUsContent["values"] }) {
  return (
    <section className="border-t border-border">
      <div className="mx-auto max-w-7xl px-6 py-24 lg:px-8 lg:py-32">
        <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Értékeink
        </h2>

        <div className="mt-16 grid gap-12 sm:grid-cols-2 lg:grid-cols-3">
          {values.map((value, i) => (
            <div key={i}>
              <span className="text-sm font-medium text-muted-foreground tabular-nums">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-3 text-xl font-semibold text-foreground">{value.title}</h3>
              {value.description && (
                <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                  {value.description}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ContactSection({ contact }: { contact: AboutUsContent["contact"] }) {
  return (
    <section className="border-t border-border bg-muted/30">
      <div className="mx-auto max-w-7xl px-6 py-24 lg:px-8 lg:py-32">
        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Kapcsolat
            </h2>
            <p className="mt-4 max-w-md text-lg text-muted-foreground">
              Kérdésed van? Keress minket bizalommal!
            </p>

            <dl className="mt-10 space-y-6">
              {contact.address && (
                <div className="flex gap-4">
                  <dt>
                    <MapPin className="mt-0.5 size-5 text-muted-foreground" />
                  </dt>
                  <dd className="text-base text-foreground">{contact.address}</dd>
                </div>
              )}
              {contact.phone && (
                <div className="flex gap-4">
                  <dt>
                    <Phone className="mt-0.5 size-5 text-muted-foreground" />
                  </dt>
                  <dd>
                    <a
                      href={`tel:${contact.phone.replace(/\s/g, "")}`}
                      className="text-base text-foreground transition-colors hover:text-muted-foreground"
                    >
                      {contact.phone}
                    </a>
                  </dd>
                </div>
              )}
              {contact.email && (
                <div className="flex gap-4">
                  <dt>
                    <Mail className="mt-0.5 size-5 text-muted-foreground" />
                  </dt>
                  <dd>
                    <a
                      href={`mailto:${contact.email}`}
                      className="text-base text-foreground transition-colors hover:text-muted-foreground"
                    >
                      {contact.email}
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {contact.mapEmbedUrl && (
            <div className="relative overflow-hidden rounded-sm" style={{ aspectRatio: "4/3" }}>
              <iframe
                src={contact.mapEmbedUrl}
                title="Térkép"
                className="absolute inset-0 size-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
