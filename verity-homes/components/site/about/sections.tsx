// design/about.html sections below the page hero. Server components; scroll reveals use the
// React-owned <Reveal> (components/site/reveal.tsx), never classList.
import Image from "next/image";
import Link from "next/link";
import type { PartnerView } from "@/lib/db/queries/trust";
import { prefetchFor } from "@/lib/nav";
import { CeoSection, ceoText } from "../ceo";
import { ArrowIcon, ShieldIcon } from "../icons";
import { PartnerMarquee } from "../partner-marquee";
import { PillTicker } from "../pill-ticker";
import { Reveal } from "../reveal";
import styles from "./about.module.css";

/** The sheet: two overlapping photos + "Our story". The company story is owner-supplied. */
export function Story() {
  return (
    <section className="sheet" aria-labelledby="story-h">
      <div className="container">
        <div className={styles.split}>
          <div className={styles.media}>
            <Reveal variant="image" className={`${styles.m1} media`}>
              <Image
                src="/samples/dusk.jpg"
                alt="Family home lit at dusk"
                fill
                sizes="(max-width: 960px) 72vw, 440px"
              />
            </Reveal>
            <Reveal variant="image" className={`${styles.m2} media`}>
              <Image
                src="/samples/building.jpg"
                alt="Modern apartment building"
                fill
                sizes="(max-width: 960px) 48vw, 300px"
              />
            </Reveal>
          </div>
          <div>
            <Reveal as="span">
              <PillTicker label="Our story" />
            </Reveal>
            <Reveal as="h2" className="h2" id="story-h">
              A property company built on <em>truth.</em>
            </Reveal>
            <Reveal as="p" className={`lead ${styles.lead1}`}>
              Verity Homes and Properties Ltd helps families, professionals and investors buy, rent,
              develop and invest in property with confidence — through one team that walks with you
              from first enquiry to the day you get your keys.
            </Reveal>
            <Reveal as="p" className={`lead ${styles.lead2}`}>
              <span className="ph">
                [Company story — why Verity was started and what makes it different.]
              </span>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

const VALUES = [
  {
    title: "Verified before listed",
    text: "We check documents and ownership before a property appears on this site.",
  },
  {
    title: "Everything in writing",
    text: "Every sale, tenancy and investment comes with clear written terms.",
  },
  {
    title: "One team, start to finish",
    text: "Sales, rentals, land, management and development under one roof.",
  },
] as const;

/** "How we work": three numbered value cards. */
export function Values() {
  return (
    <section className="sec" aria-labelledby="val-h">
      <div className="container">
        <div className="sec-head">
          <div>
            <PillTicker label="What we stand for" />
            <h2 className="h2" id="val-h">
              How we <em>work.</em>
            </h2>
          </div>
        </div>
        <div className={styles.values}>
          {VALUES.map((v, i) => (
            <Reveal key={v.title} className={styles.value}>
              <b aria-hidden="true">{String(i + 1).padStart(2, "0")}</b>
              <h3>{v.title}</h3>
              <p>{v.text}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/** "Meet Esther." Bio and promise stay placeholders until supplied (Open question 4). */
export function AboutCeo() {
  return (
    <CeoSection>
      <PillTicker label="Leadership" />
      <h2 className="h2" id="ceo-h">
        Meet <em>Esther.</em>
      </h2>
      <p className={`lead ${ceoText.lead1}`}>
        <span className="ph">
          [Full bio — Esther&apos;s background in real estate and property investment, the partners
          she works with, and why she founded Verity.]
        </span>
      </p>
      <blockquote>
        <span className="ph">A one-line personal promise from Esther to her clients.</span>
      </blockquote>
      <div className={ceoText.actions}>
        <Link
          className="btn btn-navy"
          href="/contact#message"
          prefetch={prefetchFor("/contact#message")}
        >
          Book a consultation
          <ArrowIcon />
        </Link>
      </div>
    </CeoSection>
  );
}

type TrustProps = {
  companyName: string;
  rcNumber: string;
  officeArea: string;
  /** Published + consentConfirmed only; the strip is hidden when empty. */
  partners: readonly PartnerView[];
};

/** CAC registration card (values from SiteSettings) + partner marquee (if any). */
export function Trust({ companyName, rcNumber, officeArea, partners }: TrustProps) {
  return (
    <section className="sec" aria-labelledby="cac-h">
      <div className="container">
        <Reveal className={styles.trust} data-testid="cac-card">
          <div className={styles.trustHead}>
            <span className={styles.seal}>
              <ShieldIcon />
            </span>
            <div>
              <h3 id="cac-h">A registered Nigerian company</h3>
              <p>Registered with the Corporate Affairs Commission.</p>
            </div>
          </div>
          <dl>
            <div>
              <dt>Company</dt>
              <dd>{companyName}</dd>
            </div>
            <div>
              <dt>RC number</dt>
              <dd>{rcNumber}</dd>
            </div>
            <div>
              <dt>Office</dt>
              <dd>{officeArea}</dd>
            </div>
          </dl>
        </Reveal>
        {partners.length > 0 ? (
          <Reveal className={styles.partners}>
            <PartnerMarquee partners={partners} labelId="about-partners-label" light />
          </Reveal>
        ) : null}
      </div>
    </section>
  );
}

/** Navy "Ready to start?" box. */
export function AboutCta() {
  return (
    <section className={`sec ${styles.ctaSec}`} aria-labelledby="cta-h">
      <div className="container">
        <Reveal className={`${styles.box} on-navy`}>
          <div className={styles.boxText}>
            <h2 className="h2" id="cta-h">
              Ready to start?
            </h2>
            <p className="lead">
              Buy, rent, invest or hand over a property to manage — we&apos;re one message away.
            </p>
          </div>
          <div className={styles.boxActions}>
            <Link
              className="btn btn-gold"
              href="/contact#message"
              prefetch={prefetchFor("/contact#message")}
            >
              Contact us
            </Link>
            <Link
              className="btn btn-outline"
              href="/properties"
              prefetch={prefetchFor("/properties")}
            >
              View properties
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
