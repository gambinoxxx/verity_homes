// TEMPORARY (Units 1–3): navy hero band + token and font preview, inside the site shell.
// Replaced by the real home page in Unit 4.
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Design tokens · Verity Homes and Properties",
  description: "Temporary preview of the Verity design tokens and fonts.",
};

const SWATCHES = [
  { name: "base", className: "bg-base", variable: "--bg-base" },
  { name: "subtle", className: "bg-subtle", variable: "--bg-subtle" },
  { name: "cream", className: "bg-cream", variable: "--bg-cream" },
  { name: "navy", className: "bg-navy", variable: "--bg-navy" },
  { name: "navy-deep", className: "bg-navy-deep", variable: "--bg-navy-deep" },
  { name: "navy-surface", className: "bg-navy-surface", variable: "--bg-navy-surface" },
  { name: "gold", className: "bg-gold", variable: "--accent-primary" },
  { name: "gold-soft", className: "bg-gold-soft", variable: "--accent-soft" },
  { name: "gold-text", className: "bg-gold-text", variable: "--accent-text" },
  { name: "muted", className: "bg-muted", variable: "--text-muted" },
  { name: "line", className: "bg-line", variable: "--border-default" },
  { name: "line-navy", className: "bg-line-navy", variable: "--border-navy" },
] as const;

export default function TokensPreview() {
  return (
    <>
      {/* Navy band so the transparent header has something to sit over. */}
      <section className="bg-navy pt-[180px] pb-24 text-on-navy" aria-labelledby="temp-h">
        <div className="container">
          <p className="text-sm font-bold tracking-[0.2em] text-gold uppercase">
            Temporary home page
          </p>
          <h1
            id="temp-h"
            className="mt-4 font-display text-[clamp(54px,8vw,116px)] leading-[0.95] font-semibold tracking-[-1.5px]"
          >
            Invest. Own. <em className="text-gold italic">Live.</em>
          </h1>
          <p className="mt-6 max-w-[560px] text-lg leading-[1.7] text-on-navy-muted">
            Site shell preview. The real home page arrives in Unit 4.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-site px-6 py-20">
        <p className="text-sm font-bold tracking-[0.2em] text-gold-text uppercase">
          Unit 1 · Tokens
        </p>
        <h2 className="mt-4 font-display text-[clamp(38px,5.2vw,72px)] leading-[1.02] font-semibold tracking-[-1px]">
          Verity <em className="text-gold-text italic">design</em> tokens
        </h2>
        <p className="mt-6 max-w-2xl text-lg leading-[1.75] text-muted">
          Manrope is the UI and body font. Headings use Playfair Display, with italic accent words.
        </p>

        <ul className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {SWATCHES.map((s) => (
            <li key={s.name} className="overflow-hidden rounded-card border border-line">
              <div className={`h-20 ${s.className}`} />
              <div className="p-3 text-sm">
                <b className="block">{s.name}</b>
                <code className="text-muted">{s.variable}</code>
              </div>
            </li>
          ))}
        </ul>

        <section className="mt-12 rounded-panel bg-navy p-8 text-on-navy">
          <h2 className="font-display text-4xl font-semibold">
            Homes you can <em className="text-gold italic">trust</em>
          </h2>
          <p className="mt-3 text-on-navy-muted">Muted text on navy.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <span className="inline-flex min-h-[52px] items-center rounded-pill bg-gold px-7 font-bold text-navy">
              Gold pill
            </span>
            <span className="inline-flex min-h-[52px] items-center rounded-pill border border-on-navy-muted px-7 font-bold">
              Outline pill
            </span>
          </div>
        </section>
      </div>
    </>
  );
}
