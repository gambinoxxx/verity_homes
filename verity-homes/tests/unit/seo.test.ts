// Unit 20: page metadata, Organization JSON-LD, sitemap entries and robots rules.
import { describe, expect, it } from "vitest";
import { DEFAULT_OG_IMAGE, organizationJsonLd, pageMetadata } from "@/lib/seo";
import { STATIC_SITEMAP_PATHS, robotsRules, sitemapEntries } from "@/lib/sitemap";

const SITE = "https://verityhomes.com.ng";

describe("pageMetadata", () => {
  it("sets title, description, canonical, og:url and the default brand image", () => {
    const m = pageMetadata({ title: "About us — X", description: "About.", path: "/about" });
    expect(m.title).toBe("About us — X");
    expect(m.description).toBe("About.");
    expect(m.alternates?.canonical).toBe("/about");
    expect(m.openGraph).toMatchObject({
      url: "/about",
      title: "About us — X",
      description: "About.",
      siteName: "Verity Homes and Properties",
      locale: "en_NG",
      type: "website",
      images: [DEFAULT_OG_IMAGE],
    });
    expect(m.twitter).toMatchObject({
      card: "summary_large_image",
      images: [DEFAULT_OG_IMAGE.url],
    });
  });

  it("uses the cover photo when there is one, and a separate og:description", () => {
    const m = pageMetadata({
      title: "T",
      description: "Meta.",
      ogDescription: "Social.",
      path: `${SITE}/properties/x`,
      image: { url: `${SITE}/a.jpg`, alt: "A house" },
    });
    expect(m.description).toBe("Meta.");
    expect(m.openGraph).toMatchObject({
      description: "Social.",
      images: [{ url: `${SITE}/a.jpg`, alt: "A house" }],
    });
    expect(m.twitter).toMatchObject({ description: "Social.", images: [`${SITE}/a.jpg`] });
  });

  it("articles carry publishedTime and authors; websites never do", () => {
    const article = { publishedTime: "2026-11-08T00:00:00.000Z", authors: ["Esther Ezenagu"] };
    expect(
      pageMetadata({ title: "T", description: "D", path: "/blog/x", type: "article", article })
        .openGraph,
    ).toMatchObject({ type: "article", ...article });
    expect(
      pageMetadata({ title: "T", description: "D", path: "/", article }).openGraph,
    ).not.toHaveProperty("authors");
  });
});

describe("organizationJsonLd", () => {
  const base = {
    companyName: "Verity Homes and Properties Ltd",
    rcNumber: "9971213",
    officeArea: "Onipanu, Lagos State",
    phone: null,
    email: null,
    socials: { instagram: null, facebook: null, x: null, linkedin: null },
  };

  it("name, RC number as identifier, logo and the office area", () => {
    const ld = organizationJsonLd(base, SITE);
    expect(ld).toMatchObject({
      "@type": "Organization",
      name: "Verity Homes and Properties Ltd",
      url: `${SITE}/`,
      logo: `${SITE}/og/verity-logo-512.png`,
      identifier: { "@type": "PropertyValue", propertyID: "CAC RC number", value: "9971213" },
      address: { addressLocality: "Onipanu, Lagos State", addressCountry: "NG" },
    });
  });

  it("no phone, email or sameAs when they are not set", () => {
    const ld = organizationJsonLd({ ...base, phone: "  ", email: "" }, SITE);
    expect(ld).not.toHaveProperty("telephone");
    expect(ld).not.toHaveProperty("email");
    expect(ld).not.toHaveProperty("sameAs");
  });

  it("adds phone, email and social profiles when set; never a street address", () => {
    const ld = organizationJsonLd(
      {
        ...base,
        phone: "+234 800 000 0000",
        email: "info@example.com",
        socials: {
          instagram: "https://instagram.com/verity",
          facebook: null,
          x: null,
          linkedin: null,
        },
      },
      SITE,
    );
    expect(ld.telephone).toBe("+234 800 000 0000");
    expect(ld.email).toBe("info@example.com");
    expect(ld.sameAs).toEqual(["https://instagram.com/verity"]);
    expect(JSON.stringify(ld)).not.toMatch(/streetAddress/);
  });
});

describe("sitemap and robots", () => {
  it("static pages first (no lastModified), then database rows with lastModified", () => {
    const d = new Date("2026-11-10T10:00:00Z");
    const entries = sitemapEntries(
      ["/", "/about"],
      [{ path: "/blog/a-post", lastModified: d }],
      SITE,
    );
    expect(entries).toEqual([
      { url: `${SITE}/` },
      { url: `${SITE}/about` },
      { url: `${SITE}/blog/a-post`, lastModified: d },
    ]);
  });

  it("lists every public top-level page", () => {
    expect(STATIC_SITEMAP_PATHS).toEqual([
      "/",
      "/properties",
      "/invest",
      "/about",
      "/blog",
      "/contact",
      "/privacy",
    ]);
  });

  it("robots: crawl the site, not /admin or /api; points at the sitemap", () => {
    expect(robotsRules(SITE)).toEqual({
      rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/"] }],
      sitemap: `${SITE}/sitemap.xml`,
      host: SITE,
    });
  });
});
