-- Unit 19a: owner-editable CEO bio/promise, company story and the privacy-reviewed date.
-- Additive and nullable: existing rows keep working, nothing is backfilled.
ALTER TABLE "SiteSettings" ADD COLUMN "ceoBio" TEXT,
ADD COLUMN "ceoPromise" TEXT,
ADD COLUMN "companyStory" TEXT,
ADD COLUMN "privacyReviewedAt" TIMESTAMP(3);
