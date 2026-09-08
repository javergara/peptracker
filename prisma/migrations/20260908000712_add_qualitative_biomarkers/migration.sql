-- AlterTable
ALTER TABLE "Biomarker" ADD COLUMN     "qualitativeOptions" JSONB,
ADD COLUMN     "valueType" TEXT NOT NULL DEFAULT 'numeric';

-- AlterTable
ALTER TABLE "LabResult" ADD COLUMN     "qualitativeValue" TEXT;
