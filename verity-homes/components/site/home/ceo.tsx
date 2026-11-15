import Link from "next/link";
import { env } from "@/lib/env";
import { prefetchFor } from "@/lib/nav";
import { Markdown } from "../blog/markdown";
import { CeoSection, ceoText } from "../ceo";
import { ArrowIcon } from "../icons";
import { Reveal } from "../reveal";

/**
 * Home "Meet our CEO" (design/index.html). Bio (Markdown) and promise come from site settings
 * (Unit 19a); each keeps the design's placeholder while empty.
 */
export function Ceo({ bio, promise }: { bio: string | null; promise: string | null }) {
  return (
    <CeoSection>
      <Reveal as="span" className="eyebrow">
        Meet our CEO
      </Reveal>
      <Reveal as="h2" className="h2" delay={1} id="ceo-h">
        Built on trust. <em>Named for it.</em>
      </Reveal>
      <Reveal as="p" className={`lead ${ceoText.lead1}`} delay={2}>
        Every listing we present, every plan we offer and every promise we make is held to one
        standard: the truth. That&apos;s the name on the door.
      </Reveal>
      {bio ? (
        <Reveal className={`lead ${ceoText.lead2}`} delay={2} data-testid="ceo-bio">
          <Markdown source={bio} siteUrl={env.NEXT_PUBLIC_SITE_URL} className={ceoText.md} />
        </Reveal>
      ) : (
        <Reveal as="p" className={`lead ${ceoText.lead2}`} delay={2}>
          <span className="ph">
            [Short bio — Esther&apos;s background in real estate and property investment, the
            partners she works with, and why she founded Verity.]
          </span>
        </Reveal>
      )}
      <Reveal as="blockquote" delay={3} data-testid="ceo-promise">
        {promise ? (
          promise
        ) : (
          <span className="ph">A one-line personal promise from Esther to her clients.</span>
        )}
      </Reveal>
      <Reveal className={ceoText.actions} delay={3}>
        <a className="btn btn-navy" href="#contact">
          Book a consultation
          <ArrowIcon />
        </a>
        <Link className="btn btn-outline-dark" href="/about" prefetch={prefetchFor("/about")}>
          About Verity
        </Link>
      </Reveal>
    </CeoSection>
  );
}
