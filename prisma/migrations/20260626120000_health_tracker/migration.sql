-- AlterTable: profile sex + birth year (sex/age-aware reference ranges)
ALTER TABLE "User" ADD COLUMN "sex" TEXT;
ALTER TABLE "User" ADD COLUMN "birthYear" INTEGER;

-- AlterTable: link a lab result to the biomarker catalog
ALTER TABLE "LabResult" ADD COLUMN "biomarkerSlug" TEXT;

-- CreateTable: global biomarker catalog + knowledge base
CREATE TABLE "Biomarker" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "aliases" JSONB NOT NULL,
    "system" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "whatItMeans" TEXT NOT NULL,
    "raises" JSONB NOT NULL,
    "lowers" JSONB NOT NULL,
    "confounders" JSONB NOT NULL,
    "relatedPeptides" JSONB NOT NULL,
    "ranges" JSONB NOT NULL,
    "references" JSONB NOT NULL,
    "direction" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Biomarker_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Biomarker_slug_key" ON "Biomarker"("slug");

-- CreateTable: continuous supplements (date-range tracking)
CREATE TABLE "Supplement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "dose" TEXT,
    "frequency" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Supplement_userId_idx" ON "Supplement"("userId");

-- CreateTable: one-off lab-recheck action items
CREATE TABLE "LabReminder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "biomarkerSlug" TEXT,
    "label" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "completedAt" TIMESTAMP(3),
    "lastNotifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LabReminder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LabReminder_userId_idx" ON "LabReminder"("userId");

-- AddForeignKey
ALTER TABLE "Supplement" ADD CONSTRAINT "Supplement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabReminder" ADD CONSTRAINT "LabReminder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
