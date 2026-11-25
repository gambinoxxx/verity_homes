// One area page (Unit 21 step 6). Every sentence is built from the area's own listings
// (lib/areas.ts areaCopy) — nothing is claimed about the area itself.
import Link from "next/link";
import { areaCopy, type AreaGroup } from "@/lib/areas";
import type { PropertyCard as PropertyCardData } from "@/lib/db/queries/properties";
import { getSiteSettings } from "@/lib/db/queries/settings";
import { env } from "@/lib/env";
import { LANDING_LINKS } from "@/lib/landing-pages";
import { questionMessage } from "@/lib/whatsapp";
import { HelpCta } from "../help-cta";
import { PageHero } from "../page-hero";
import { PropertyCard } from "../property-card";
import styles from "./area.module.css";

const AREA_LANDINGS = ["/buy-house-lagos", "/rent-apartment-lagos", "/land-for-sale-lagos"];

export async function AreaPageView({
  group,
  items,
  others,
}: {
  group: AreaGroup;
  items: PropertyCardData[];
  others: AreaGroup[];
}) {
  const settings = await getSiteSettings();
  const copy = areaCopy(group);
  const path = `/properties/in/${group.slug}`;
  const url = new URL(path, env.NEXT_PUBLIC_SITE_URL).toString();
  return (
    <>
      <PageHero
        variant="post"
        title={copy.h1}
        crumbs={[
          { label: "Home", href: "/" },
          { label: "Properties", href: "/properties" },
          { label: group.name },
        ]}
        image="/samples/villa.jpg"
      />
      <section className="sheet subtle" aria-label={`Properties in ${group.name}`}>
        <div className="container">
          <p className={`lead ${styles.intro}`}>{copy.intro}</p>
          <div className={styles.grid}>
            {items.map((p) => (
              <PropertyCard key={p.id} property={p} />
            ))}
          </div>
          <div className={styles.cta}>
            <HelpCta
              title={`Looking for property in ${group.name}?`}
              text="Tell us your budget and what you need. We'll send you what's available, documents checked."
              whatsapp={settings.whatsapp}
              whatsappText={questionMessage(`property in ${group.name}`, url)}
              ownerId={`area-${group.slug}`}
              callBackHref="/contact#message"
            />
          </div>
          <div className={styles.links}>
            <nav aria-label="Popular searches">
              <h2>Popular searches</h2>
              <ul>
                {LANDING_LINKS.filter((l) => AREA_LANDINGS.includes(l.href)).map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} prefetch={false}>
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            {others.length ? (
              <nav aria-label="Other areas">
                <h2>Other areas</h2>
                <ul>
                  {others.map((g) => (
                    <li key={g.slug}>
                      <Link href={`/properties/in/${g.slug}`} prefetch={false}>
                        {g.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ) : null}
          </div>
        </div>
      </section>
    </>
  );
}
