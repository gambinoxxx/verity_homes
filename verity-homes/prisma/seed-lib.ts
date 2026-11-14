// Seed safety (used by prisma/seed.ts; unit-tested in tests/unit/seed-cleanup.test.ts).
// The dev database is also the live site's database, so the seed must only ever touch the
// sample rows it owns: rows whose title/name starts with "[SAMPLE]".
// - Sample rows are UPSERTED by a stable key (slug, name, question…), so running the seed twice
//   changes nothing and real rows that link to a sample (e.g. an enquiry) keep their link.
// - cleanupStaleSamples() deletes only "[SAMPLE]" rows that the current seed no longer defines,
//   and "[SAMPLE]"-named enquiries. It never deletes SiteSettings, Subscribers, categories or any
//   row without the prefix. Real enquiries about a sample listing are kept (unlinked by SetNull
//   only if that sample listing is removed).
import type { PrismaClient } from "../lib/generated/prisma/client";

export const SAMPLE_PREFIX = "[SAMPLE]";

/** What the current seed defines; anything else with the prefix is stale. */
export type SampleKeys = {
  propertySlugs: string[];
  postSlugs: string[];
  planNames: string[];
  /** FAQ questions; an FAQ counts as sample when its question or answer has the prefix. */
  faqQuestions: string[];
  /** "name|serviceUsed" */
  testimonialKeys: string[];
  partnerNames: string[];
};

export const NO_KEYS: SampleKeys = {
  propertySlugs: [],
  postSlugs: [],
  planNames: [],
  faqQuestions: [],
  testimonialKeys: [],
  partnerNames: [],
};

export type CleanupReport = {
  properties: number;
  posts: number;
  plans: number;
  faqs: number;
  testimonials: number;
  partners: number;
  enquiries: number;
  redirects: number;
};

/**
 * Deletes "[SAMPLE]" rows that aren't in `keep`. `prefix` is only overridden by the unit test
 * (so it can exercise this on the shared test database without touching real sample rows).
 */
export async function cleanupStaleSamples(
  db: PrismaClient,
  keep: SampleKeys = NO_KEYS,
  prefix = SAMPLE_PREFIX,
): Promise<CleanupReport> {
  const starts = { startsWith: prefix };

  const props = await db.property.findMany({
    where: { title: starts, slug: { notIn: keep.propertySlugs } },
    select: { id: true, slug: true },
  });
  const posts = await db.post.findMany({
    where: { title: starts, slug: { notIn: keep.postSlugs } },
    select: { id: true, slug: true },
  });

  // Only enquiries the seed could have made (named with the prefix). A real visitor's
  // enquiry is never deleted, even if it's about a sample listing.
  const enquiries = await db.enquiry.deleteMany({ where: { name: starts } });

  const redirects = await db.slugRedirect.deleteMany({
    where: {
      OR: [
        {
          entity: "PROPERTY",
          OR: [
            { toSlug: { in: props.map((p) => p.slug) } },
            { fromSlug: { in: props.map((p) => p.slug) } },
          ],
        },
        {
          entity: "POST",
          OR: [
            { toSlug: { in: posts.map((p) => p.slug) } },
            { fromSlug: { in: posts.map((p) => p.slug) } },
          ],
        },
      ],
    },
  });
  // images, documents and plots cascade with their property
  const properties = await db.property.deleteMany({
    where: { id: { in: props.map((p) => p.id) } },
  });
  const postsDeleted = await db.post.deleteMany({ where: { id: { in: posts.map((p) => p.id) } } });
  const plans = await db.investmentPlan.deleteMany({
    where: { name: starts, NOT: { name: { in: keep.planNames } } },
  });
  const faqs = await db.faq.deleteMany({
    where: {
      OR: [{ question: starts }, { answer: starts }],
      NOT: { question: { in: keep.faqQuestions } },
    },
  });
  const sampleTestimonials = await db.testimonial.findMany({
    where: { name: starts },
    select: { id: true, name: true, serviceUsed: true },
  });
  const staleTestimonials = sampleTestimonials.filter(
    (t) => !keep.testimonialKeys.includes(`${t.name}|${t.serviceUsed}`),
  );
  const testimonials = await db.testimonial.deleteMany({
    where: { id: { in: staleTestimonials.map((t) => t.id) } },
  });
  const partners = await db.partner.deleteMany({
    where: { name: starts, NOT: { name: { in: keep.partnerNames } } },
  });

  return {
    properties: properties.count,
    posts: postsDeleted.count,
    plans: plans.count,
    faqs: faqs.count,
    testimonials: testimonials.count,
    partners: partners.count,
    enquiries: enquiries.count,
    redirects: redirects.count,
  };
}
