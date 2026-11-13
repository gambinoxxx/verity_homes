// FAQ schema (Unit 17), shared by /admin/faqs and lib/actions/faq.ts. Plain text; line breaks
// are kept (the public page shows blank-line-separated paragraphs and single line breaks).
import { z } from "zod";
import { GUARANTEE_MESSAGE, mentionsGuarantee } from "./no-guarantee";

export const FAQ_PAGES = ["INVEST", "GENERAL"] as const;
export type FaqPageKey = (typeof FAQ_PAGES)[number];
export const FAQ_PAGE_LABEL: Record<FaqPageKey, string> = {
  INVEST: "Invest page",
  GENERAL: "General",
};

export const FAQ_LIMITS = { question: 200, answer: 2000 } as const;

export const faqSchema = z.object({
  page: z.enum(FAQ_PAGES, "Choose where the FAQ appears"),
  question: z
    .string()
    .trim()
    .min(1, "Add the question")
    .max(FAQ_LIMITS.question, "Keep the question under 200 characters")
    .refine((s) => !mentionsGuarantee(s), GUARANTEE_MESSAGE),
  answer: z
    .string()
    .transform((s) => s.replace(/\r\n/g, "\n").trim())
    .pipe(
      z
        .string()
        .min(1, "Add the answer")
        .max(FAQ_LIMITS.answer, "Keep the answer under 2,000 characters")
        .refine((s) => !mentionsGuarantee(s), GUARANTEE_MESSAGE),
    ),
});

export type FaqInput = z.input<typeof faqSchema>;
