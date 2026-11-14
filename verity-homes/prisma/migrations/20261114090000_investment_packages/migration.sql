-- AlterEnum
ALTER TYPE "RedirectEntity" ADD VALUE 'PLAN';

-- AlterTable
ALTER TABLE "Enquiry" ADD COLUMN     "packageId" TEXT;

-- AlterTable
ALTER TABLE "InvestmentPlan" ADD COLUMN     "contractWith" TEXT,
ADD COLUMN     "coverAlt" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "coverPathname" TEXT,
ADD COLUMN     "coverUrl" TEXT,
ADD COLUMN     "description" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "exitTerms" TEXT,
ADD COLUMN     "partnerName" TEXT,
ADD COLUMN     "payoutTerms" TEXT,
ADD COLUMN     "slug" TEXT;

-- CreateTable
CREATE TABLE "InvestmentPackage" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "label" TEXT,
    "amountKobo" BIGINT NOT NULL,
    "returnAmountKobo" BIGINT NOT NULL,
    "tenureMonths" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "InvestmentPackage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InvestmentPackage_planId_sortOrder_idx" ON "InvestmentPackage"("planId", "sortOrder");

-- Backfill (hand-written): existing plans get a slug from their name, unique with -2, -3…
UPDATE "InvestmentPlan" AS p
SET "slug" = s.slug
FROM (
  SELECT id, base || CASE WHEN rn > 1 THEN '-' || rn ELSE '' END AS slug
  FROM (
    SELECT id,
      coalesce(nullif(trim(both '-' from regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g')), ''), 'plan') AS base,
      row_number() OVER (
        PARTITION BY coalesce(nullif(trim(both '-' from regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g')), ''), 'plan')
        ORDER BY "createdAt", id
      ) AS rn
    FROM "InvestmentPlan"
  ) t
) s
WHERE p.id = s.id AND p."slug" IS NULL;

-- CreateIndex
CREATE UNIQUE INDEX "InvestmentPlan_slug_key" ON "InvestmentPlan"("slug");

-- AddForeignKey
ALTER TABLE "InvestmentPackage" ADD CONSTRAINT "InvestmentPackage_planId_fkey" FOREIGN KEY ("planId") REFERENCES "InvestmentPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enquiry" ADD CONSTRAINT "Enquiry_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "InvestmentPackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

