import Link from "next/link";
import { prefetchFor } from "@/lib/nav";
import { CeoSection, ceoText } from "../ceo";
import { ArrowIcon } from "../icons";
import { Reveal } from "../reveal";

/** Home "Meet our CEO" (design/index.html). Bio and promise stay placeholders (Open question 4). */
export function Ceo() {
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
      <Reveal as="p" className={`lead ${ceoText.lead2}`} delay={2}>
        <span className="ph">
          [Short bio — Esther&apos;s background in real estate and property investment, the partners
          she works with, and why she founded Verity.]
        </span>
      </Reveal>
      <Reveal as="blockquote" delay={3}>
        <span className="ph">A one-line personal promise from Esther to her clients.</span>
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
