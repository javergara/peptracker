-- CreateTable
CREATE TABLE "ImagingStudy" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "modality" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bodyRegion" TEXT,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "performedAt" TIMESTAMP(3),
    "followUpAt" TIMESTAMP(3),
    "findings" TEXT,
    "impression" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImagingStudy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ImagingStudy_userId_idx" ON "ImagingStudy"("userId");

-- AddForeignKey
ALTER TABLE "ImagingStudy" ADD CONSTRAINT "ImagingStudy_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
