-- AlterTable
ALTER TABLE "Enquiry" ADD COLUMN     "plotId" TEXT;

-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "developerName" TEXT,
ADD COLUMN     "offerEndsAt" TIMESTAMP(3),
ADD COLUMN     "offerNote" TEXT,
ADD COLUMN     "paymentPlan" TEXT,
ADD COLUMN     "termsNote" TEXT;

-- CreateTable
CREATE TABLE "PropertyPlot" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "label" TEXT,
    "sizeSqm" INTEGER NOT NULL,
    "priceKobo" BIGINT NOT NULL,
    "initialDepositKobo" BIGINT,
    "suitableFor" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PropertyPlot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PropertyPlot_propertyId_sortOrder_idx" ON "PropertyPlot"("propertyId", "sortOrder");

-- CreateIndex
CREATE INDEX "PropertyPlot_priceKobo_idx" ON "PropertyPlot"("priceKobo");

-- AddForeignKey
ALTER TABLE "PropertyPlot" ADD CONSTRAINT "PropertyPlot_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enquiry" ADD CONSTRAINT "Enquiry_plotId_fkey" FOREIGN KEY ("plotId") REFERENCES "PropertyPlot"("id") ON DELETE SET NULL ON UPDATE CASCADE;
