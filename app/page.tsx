import Image from "next/image";
import Link from "next/link";

import { client } from "@/sanity/lib/client";
import { urlFor } from "@/sanity/lib/image";
import {
  cafeQuery,
  menuSectionsQuery,
  recentAktuellQuery,
} from "@/sanity/lib/queries";

import styles from "./page.module.css";
import { RichText } from "./PortableText";

type ImageRef = {
  asset?: { _ref?: string };
  alt?: string;
  caption?: string;
  hotspot?: unknown;
};

type Handwerk = { name?: string; description?: string };

type Feature = {
  title?: string;
  eyebrow?: string;
  body?: string;
  attribution?: string;
};

type Cafe = {
  name?: string;
  tagline?: string;
  hero?: ImageRef;
  logo?: ImageRef;
  intro?: Parameters<typeof RichText>[0]["value"];
  handwerke?: Handwerk[];
  team?: {
    photo?: ImageRef;
    title?: string;
    body?: string;
  };
  features?: Feature[];
  address?: { street?: string; zip?: string; city?: string };
  phone?: string;
  email?: string;
  owners?: string;
  locationHint?: string;
  hours?: { label?: string; value?: string }[];
  specialHours?: { date?: string; value?: string }[];
  hoursNote?: string;
};

type Highlight = {
  _id: string;
  name?: string;
  category?: string;
  description?: string;
  price?: string;
  note?: string;
  featured?: boolean;
  photo?: ImageRef;
};

type MenuSection = {
  _id: string;
  title?: string;
  headline?: string;
  slug?: string;
  subtitle?: string;
  intro?: string;
  pdf?: {
    asset?: { url?: string; originalFilename?: string; size?: number };
  };
  pdfLabel?: string;
  extras?: { name?: string; price?: string }[];
  highlights?: Highlight[];
};

type AktuellPreview = {
  _id: string;
  title?: string;
  slug?: string;
  date?: string;
  excerpt?: string;
  cover?: ImageRef;
};

const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
const toRoman = (n: number) => ROMAN[n] ?? String(n);

type DisplayStyle = "list" | "grid" | "cards";
function detectDisplayStyle(highlights: Highlight[]): DisplayStyle {
  if (!highlights.length) return "list";
  if (highlights.some((h) => h.featured)) return "cards";
  if (highlights.some((h) => h.category)) return "grid";
  return "list";
}

export const dynamic = "force-static";

export default async function HomePage() {
  if (!process.env.NEXT_PUBLIC_SANITY_PROJECT_ID) {
    return <SetupNotice />;
  }

  const [cafe, sections, aktuell] = await Promise.all([
    client.fetch<Cafe | null>(cafeQuery),
    client.fetch<MenuSection[]>(menuSectionsQuery),
    client.fetch<AktuellPreview[]>(recentAktuellQuery),
  ]);

  if (!cafe) {
    return <EmptyContentNotice />;
  }

  // Roman numerals across numbered sections.
  let n = 0;
  const next = () => toRoman(++n);

  const handwerkeRoman = cafe.handwerke?.length ? next() : null;
  const teamRoman = cafe.team?.photo || cafe.team?.body ? next() : null;
  const sectionRomans = (sections ?? []).map(() => next());
  const featureRomans = (cafe.features ?? []).map(() => next());
  const hoursRoman = cafe.hours?.length ? next() : null;
  const visitRoman = next();

  return (
    <main className={styles.page}>
      <Header cafe={cafe} />
      <Hero cafe={cafe} />
      {cafe.intro && <IntroBlock value={cafe.intro} />}
      {cafe.handwerke?.length && handwerkeRoman && (
        <HandwerkeBlock items={cafe.handwerke} roman={handwerkeRoman} />
      )}
      {cafe.team && teamRoman && (
        <TeamBlock team={cafe.team} roman={teamRoman} />
      )}
      {(sections ?? []).map((section, i) => (
        <MenuSectionBlock
          key={section._id}
          section={section}
          roman={sectionRomans[i]}
        />
      ))}
      {(cafe.features ?? []).map((feature, i) => (
        <FeatureBlock
          key={`feature-${i}`}
          feature={feature}
          roman={featureRomans[i]}
          variant={featureVariant(i)}
        />
      ))}
      {cafe.hours?.length && hoursRoman && (
        <HoursBlock cafe={cafe} roman={hoursRoman} />
      )}
      <VisitBlock cafe={cafe} roman={visitRoman} />
      {(aktuell ?? []).length > 0 && <Aktuelles items={aktuell ?? []} />}
      <Footer cafe={cafe} />
    </main>
  );
}

function featureVariant(i: number): "quote" | "signature" | "plain" {
  // Cycle three treatments so successive features feel different.
  const cycle = ["quote", "signature", "plain"] as const;
  return cycle[i % cycle.length];
}

function Header({ cafe }: { cafe: Cafe }) {
  const logoUrl = cafe.logo?.asset
    ? urlFor(cafe.logo).width(400).quality(90).url()
    : null;
  return (
    <header className={styles.topbar}>
      <a href="#" className={styles.wordmark}>
        {logoUrl ? (
          <Image
            src={logoUrl}
            alt={cafe.name ?? ""}
            width={140}
            height={48}
            priority
            className={styles.wordmarkLogo}
          />
        ) : (
          <span className={styles.wordmarkText}>{cafe.name}</span>
        )}
      </a>
      {cafe.phone && (
        <a
          href={`tel:${cafe.phone.replace(/\s+/g, "")}`}
          className={styles.topbarPhone}
        >
          {cafe.phone}
        </a>
      )}
    </header>
  );
}

function Hero({ cafe }: { cafe: Cafe }) {
  const heroUrl = cafe.hero?.asset
    ? urlFor(cafe.hero).width(2400).quality(80).url()
    : null;
  const titleParts = (cafe.name ?? "").split(/\s+/);
  const lastWord = titleParts.length > 1 ? titleParts.pop() : null;
  const restWords = titleParts.join(" ");
  return (
    <section className={styles.hero}>
      {heroUrl && (
        <Image
          src={heroUrl}
          alt={cafe.hero?.alt ?? cafe.name ?? ""}
          fill
          priority
          sizes="100vw"
          className={styles.heroImage}
        />
      )}
      <div className={styles.heroVeil} />
      <div className={styles.heroBlock}>
        <span className={styles.heroEyebrow}>
          <span className={styles.heroEyebrowDot} aria-hidden />
          {cafe.address?.city
            ? `Im Herzen von ${cafe.address.city}`
            : "Schwyz"}
        </span>
        <h1 className={styles.heroTitle}>
          {restWords && <span className={styles.heroTitleA}>{restWords}</span>}
          {lastWord && <span className={styles.heroTitleB}>{lastWord}.</span>}
          {!restWords && !lastWord && cafe.name && (
            <span className={styles.heroTitleB}>{cafe.name}</span>
          )}
        </h1>
        {cafe.tagline && (
          <p className={styles.heroLead}>
            <em>{cafe.tagline}</em>
          </p>
        )}
      </div>
      <div className={styles.heroOrn} aria-hidden>
        <Diamond />
        <span className={styles.heroOrnRule} />
        <Diamond />
      </div>
    </section>
  );
}

function IntroBlock({
  value,
}: {
  value: NonNullable<Cafe["intro"]>;
}) {
  return (
    <article className={styles.intro}>
      <div className={styles.introBody}>
        <RichText value={value} />
      </div>
    </article>
  );
}

function SectionEyebrow({
  roman,
  label,
  variant,
}: {
  roman?: string | null;
  label: string;
  variant?: "default" | "centered" | "light";
}) {
  return (
    <span
      className={`${styles.eyebrow} ${
        variant === "centered" ? styles.eyebrowCentered : ""
      } ${variant === "light" ? styles.eyebrowLight : ""}`}
    >
      {roman && <span className={styles.eyebrowNumeral}>{roman}</span>}
      {roman && <span className={styles.eyebrowRule} aria-hidden />}
      <span className={styles.eyebrowText}>{label}</span>
    </span>
  );
}

function HandwerkeBlock({
  items,
  roman,
}: {
  items: Handwerk[];
  roman: string;
}) {
  return (
    <section className={styles.handwerke}>
      <div className={styles.handwerkeHead}>
        <SectionEyebrow roman={roman} label="Drei Handwerke" />
      </div>
      <ul className={styles.handwerkeList}>
        {items.map((h, i) => (
          <li key={`${h.name}-${i}`} className={styles.handwerkItem}>
            <span className={styles.handwerkNumber}>0{i + 1}</span>
            <h2 className={styles.handwerkName}>{h.name}</h2>
            <p className={styles.handwerkLine}>{h.description}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function TeamBlock({
  team,
  roman,
}: {
  team: NonNullable<Cafe["team"]>;
  roman: string;
}) {
  const photoUrl = team.photo?.asset
    ? urlFor(team.photo).width(1200).quality(80).url()
    : null;
  return (
    <section className={styles.team}>
      <div className={styles.teamGrid}>
        {photoUrl && (
          <div className={styles.teamPhotoWrap}>
            <Image
              src={photoUrl}
              alt={team.photo?.alt ?? team.title ?? ""}
              width={800}
              height={1000}
              sizes="(max-width: 720px) 100vw, 50vw"
              className={styles.teamPhoto}
            />
            {team.photo?.caption && (
              <span className={styles.teamCaption}>{team.photo.caption}</span>
            )}
          </div>
        )}
        <div className={styles.teamCopy}>
          <SectionEyebrow roman={roman} label="Familie" />
          {team.title && (
            <h2 className={styles.teamTitle}>{team.title}</h2>
          )}
          {team.body && <p className={styles.teamBody}>{team.body}</p>}
        </div>
      </div>
    </section>
  );
}

function MenuSectionBlock({
  section,
  roman,
}: {
  section: MenuSection;
  roman: string;
}) {
  const pdfUrl = section.pdf?.asset?.url ?? null;
  const highlights = section.highlights ?? [];
  const display = detectDisplayStyle(highlights);

  const sectionClass = `${styles.menu} ${
    display === "cards" ? styles.menuDark : ""
  } ${display === "grid" ? styles.menuCompact : ""}`;

  return (
    <section className={sectionClass} id={section.slug ?? undefined}>
      <div className={styles.menuHead}>
        <SectionEyebrow
          roman={roman}
          label={section.title ?? "Menü"}
          variant={display === "cards" ? "light" : "default"}
        />
        {section.headline && (
          <h2 className={styles.menuTitle}>{section.headline}</h2>
        )}
        {section.subtitle && (
          <span className={styles.menuSubtitle}>{section.subtitle}</span>
        )}
        {pdfUrl && (
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`${styles.pdfLink} ${
              display === "cards" ? styles.pdfLinkLight : ""
            }`}
          >
            {section.pdfLabel || `PDF · ${section.title}`}
          </a>
        )}
      </div>

      {section.intro && <p className={styles.menuIntro}>{section.intro}</p>}

      {display === "list" && <MenuListView highlights={highlights} />}
      {display === "grid" && <MenuGridView highlights={highlights} />}
      {display === "cards" && <MenuCardsView highlights={highlights} />}

      {section.extras && section.extras.length > 0 && (
        <div className={styles.extras}>
          <span className={styles.extrasLabel}>Extra dazu</span>
          <ul className={styles.extrasList}>
            {section.extras.map((e, i) => (
              <li key={`${e.name}-${i}`}>
                <span>{e.name}</span>
                {e.price && (
                  <span className={styles.extrasPrice}>{e.price}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function MenuListView({ highlights }: { highlights: Highlight[] }) {
  return (
    <ul className={styles.menuList}>
      {highlights.map((h) => (
        <li key={h._id} className={styles.menuItem}>
          <div className={styles.menuRow}>
            <h3 className={styles.menuName}>
              {h.name}
              {h.note && <span className={styles.menuNote}> · {h.note}</span>}
            </h3>
            {h.price && <span className={styles.menuPrice}>{h.price}</span>}
          </div>
          {h.description && (
            <p className={styles.menuItemDescription}>{h.description}</p>
          )}
        </li>
      ))}
    </ul>
  );
}

function MenuGridView({ highlights }: { highlights: Highlight[] }) {
  const grouped = highlights.reduce<Record<string, Highlight[]>>((acc, h) => {
    const k = h.category ?? "_default";
    acc[k] = acc[k] ?? [];
    acc[k].push(h);
    return acc;
  }, {});
  const cats = Object.keys(grouped);
  return (
    <div className={styles.menuGrid}>
      {cats.map((cat) => (
        <div key={cat} className={styles.menuGridCol}>
          {cat !== "_default" && (
            <h3 className={styles.menuGridCat}>{cat}</h3>
          )}
          <ul className={styles.menuGridList}>
            {grouped[cat].map((h) => (
              <li key={h._id} className={styles.menuGridRow}>
                <span className={styles.menuGridName}>{h.name}</span>
                <span className={styles.menuGridDots} aria-hidden />
                {h.price && (
                  <span className={styles.menuGridPrice}>{h.price}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function MenuCardsView({ highlights }: { highlights: Highlight[] }) {
  return (
    <ul className={styles.menuCards}>
      {highlights.map((h) => (
        <li
          key={h._id}
          className={
            h.featured
              ? `${styles.menuCard} ${styles.menuCardFeatured}`
              : styles.menuCard
          }
        >
          {h.featured && (
            <span className={styles.menuCardBadge}>Hausspezialität</span>
          )}
          <h3 className={styles.menuCardName}>{h.name}</h3>
          {h.description && (
            <p className={styles.menuCardDesc}>{h.description}</p>
          )}
          {h.price && <span className={styles.menuCardPrice}>{h.price}</span>}
        </li>
      ))}
    </ul>
  );
}

function FeatureBlock({
  feature,
  roman,
  variant,
}: {
  feature: Feature;
  roman: string;
  variant: "quote" | "signature" | "plain";
}) {
  const baseClass = styles.feature;
  const variantClass =
    variant === "quote"
      ? styles.featureQuote
      : variant === "signature"
        ? styles.featureSignature
        : styles.featurePlain;

  if (variant === "signature") {
    return (
      <section className={`${baseClass} ${variantClass}`}>
        <div className={styles.signatureGrid}>
          <div className={styles.signatureLeft}>
            <SectionEyebrow
              roman={roman}
              label={feature.eyebrow || "Signatur"}
              variant="light"
            />
            {feature.title && (
              <h2 className={styles.signatureTitle}>
                <em>{feature.title}</em>
              </h2>
            )}
          </div>
          <div className={styles.signatureRight}>
            {feature.body && (
              <p className={styles.signatureBody}>{feature.body}</p>
            )}
            {feature.attribution && (
              <div className={styles.signatureMeta}>
                <span>{feature.attribution}</span>
              </div>
            )}
          </div>
        </div>
      </section>
    );
  }

  if (variant === "quote") {
    return (
      <section className={`${baseClass} ${variantClass}`}>
        <div className={styles.featureQuoteInner}>
          <SectionEyebrow
            roman={roman}
            label={feature.eyebrow || feature.title || ""}
            variant="centered"
          />
          {feature.body && (
            <blockquote className={styles.featureBlockquote}>
              <p>
                <span className={styles.bigQuote} aria-hidden>
                  &ldquo;
                </span>
                {feature.body}
              </p>
            </blockquote>
          )}
          {feature.attribution && (
            <p className={styles.featureAttr}>{feature.attribution}</p>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className={`${baseClass} ${variantClass}`}>
      <div className={styles.featurePlainInner}>
        <SectionEyebrow
          roman={roman}
          label={feature.eyebrow || feature.title || ""}
        />
        {feature.title && (
          <h2 className={styles.featureTitle}>
            <em>{feature.title}</em>
          </h2>
        )}
        {feature.body && <p className={styles.featureBody}>{feature.body}</p>}
        {feature.attribution && (
          <p className={styles.featureAttr}>{feature.attribution}</p>
        )}
      </div>
    </section>
  );
}

function HoursBlock({
  cafe,
  roman,
}: {
  cafe: Cafe;
  roman: string;
}) {
  return (
    <section className={styles.hours} id="oeffnungszeiten">
      <div className={styles.hoursHead}>
        <SectionEyebrow roman={roman} label="Öffnungszeiten" />
        <h2 className={styles.hoursTitle}>Wir sind für Sie da.</h2>
      </div>
      <div className={styles.hoursLayout}>
        <ul className={styles.hoursList}>
          {(cafe.hours ?? []).map((row, i) => (
            <li key={i} className={styles.hoursRow}>
              <span className={styles.hoursDay}>{row.label}</span>
              <span className={styles.hoursDots} aria-hidden />
              <span className={styles.hoursTime}>{row.value}</span>
            </li>
          ))}
        </ul>
        {cafe.specialHours && cafe.specialHours.length > 0 && (
          <aside className={styles.hoursHolidays}>
            <span className={styles.hoursHolidaysLabel}>Feiertage</span>
            <ul>
              {cafe.specialHours.map((row, i) => (
                <li key={i}>
                  <span>{row.date}</span>
                  <span>{row.value}</span>
                </li>
              ))}
            </ul>
          </aside>
        )}
      </div>
      {cafe.hoursNote && (
        <p className={styles.hoursNote}>
          <span className={styles.hoursNoteAccent}>Bitte beachten:</span>{" "}
          {cafe.hoursNote}
        </p>
      )}
    </section>
  );
}

function VisitBlock({
  cafe,
  roman,
}: {
  cafe: Cafe;
  roman: string;
}) {
  return (
    <section className={styles.visit} id="kontakt">
      <div className={styles.visitHead}>
        <SectionEyebrow roman={roman} label="Besuch · Lageplan" />
        <h2 className={styles.visitTitle}>Schauen Sie vorbei.</h2>
      </div>
      {cafe.locationHint && (
        <p className={styles.visitLocation}>
          {cafe.locationHint
            .split(/(zentral in [A-Za-zÄÖÜäöü]+)/)
            .map((part, i) =>
              /^zentral in/.test(part) ? <em key={i}>{part}</em> : <span key={i}>{part}</span>,
            )}
        </p>
      )}
      <div className={styles.visitGrid}>
        {cafe.address && (
          <div className={styles.visitItem}>
            <span className={styles.visitLabel}>Adresse</span>
            <p className={styles.visitValue}>
              {cafe.address.street}
              {cafe.address.street && <br />}
              {cafe.address.zip} {cafe.address.city}
            </p>
          </div>
        )}
        {cafe.phone && (
          <div className={styles.visitItem}>
            <span className={styles.visitLabel}>Telefon</span>
            <p className={styles.visitValue}>
              <a
                href={`tel:${cafe.phone.replace(/\s+/g, "")}`}
                className={styles.visitLink}
              >
                {cafe.phone}
              </a>
            </p>
            <span className={styles.visitMeta}>Reservation, Bestellung</span>
          </div>
        )}
        {cafe.email && (
          <div className={styles.visitItem}>
            <span className={styles.visitLabel}>E-Mail</span>
            <p className={styles.visitValue}>
              <a href={`mailto:${cafe.email}`} className={styles.visitLink}>
                {cafe.email}
              </a>
            </p>
            <span className={styles.visitMeta}>Allgemeine Anfragen</span>
          </div>
        )}
        {cafe.owners && (
          <div className={styles.visitItem}>
            <span className={styles.visitLabel}>Inhaber</span>
            <p className={styles.visitValue}>
              <em>{cafe.owners}</em>
            </p>
          </div>
        )}
      </div>
      {cafe.phone && (
        <a
          href={`tel:${cafe.phone.replace(/\s+/g, "")}`}
          className={styles.visitCta}
        >
          <span>Reservation, {cafe.phone}</span>
          <Diamond small />
        </a>
      )}
    </section>
  );
}

function Aktuelles({ items }: { items: AktuellPreview[] }) {
  return (
    <section className={styles.aktuelles}>
      <div className={styles.aktuellesHead}>
        <SectionEyebrow label="Aktuelles" />
      </div>
      <div className={styles.aktuellesGrid}>
        {items.map((item) => {
          const coverUrl = item.cover?.asset
            ? urlFor(item.cover).width(800).quality(75).url()
            : null;
          return (
            <article key={item._id} className={styles.aktuellesCard}>
              {coverUrl && (
                <div className={styles.aktuellesImage}>
                  <Image
                    src={coverUrl}
                    alt={item.cover?.alt ?? item.title ?? ""}
                    width={400}
                    height={260}
                    sizes="(max-width: 720px) 100vw, 33vw"
                  />
                </div>
              )}
              <div className={styles.aktuellesBody}>
                {item.date && (
                  <time className={styles.aktuellesDate} dateTime={item.date}>
                    {new Date(item.date).toLocaleDateString("de-CH", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </time>
                )}
                <h3 className={styles.aktuellesTitle}>{item.title}</h3>
                {item.excerpt && (
                  <p className={styles.aktuellesExcerpt}>{item.excerpt}</p>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function Footer({ cafe }: { cafe: Cafe }) {
  const sourceLabel = "cafe-ryser.ch";
  const logoUrl = cafe.logo?.asset
    ? urlFor(cafe.logo).width(400).quality(90).url()
    : null;
  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <div className={styles.footerHead}>
          {logoUrl && (
            <Image
              src={logoUrl}
              alt=""
              width={140}
              height={48}
              className={styles.footerLogo}
            />
          )}
          <span className={styles.footerLocale}>
            {cafe.address?.street}
            {cafe.address?.street && " · "}
            {cafe.address?.zip} {cafe.address?.city}
          </span>
        </div>
        <p className={styles.footerDisclaimer}>
          Unverbindlicher Entwurf für {cafe.name}. Inhalte und Bilder basieren
          auf der bestehenden Website{" "}
          <a
            href="http://www.cafe-ryser.ch/"
            target="_blank"
            rel="noopener noreferrer"
          >
            {sourceLabel}
          </a>
          . Kontakt: <a href="mailto:deine-app@proton.me">deine-app@proton.me</a>.
        </p>
        <p className={styles.footerAdmin}>
          <Link href="/studio">Verwaltung</Link>
        </p>
      </div>
    </footer>
  );
}

function Diamond({ small = false }: { small?: boolean }) {
  const size = small ? 6 : 8;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 8 8"
      aria-hidden
      style={{ display: "inline-block", verticalAlign: "middle" }}
    >
      <path d="M4 0 L8 4 L4 8 L0 4 Z" fill="currentColor" />
    </svg>
  );
}

function SetupNotice() {
  return (
    <main className={styles.notice}>
      <div className={styles.noticeInner}>
        <h1>Sanity-Projekt wird eingerichtet</h1>
        <p>
          Bitte <code>NEXT_PUBLIC_SANITY_PROJECT_ID</code> in
          <code>.env.local</code> setzen.
        </p>
      </div>
    </main>
  );
}

function EmptyContentNotice() {
  return (
    <main className={styles.notice}>
      <div className={styles.noticeInner}>
        <h1>Noch keine Inhalte</h1>
        <p>
          Im <Link href="/studio">Studio</Link> die Café-Informationen
          ausfüllen, dann erscheint hier die Startseite.
        </p>
      </div>
    </main>
  );
}
