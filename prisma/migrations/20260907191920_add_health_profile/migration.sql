-- CreateTable
CREATE TABLE "Condition" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "system" TEXT,
    "onsetDate" TIMESTAMP(3),
    "notes" TEXT,
    "biomarkerSlugs" JSONB,
    "relatedPeptides" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Condition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyHistoryEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "relative" TEXT NOT NULL,
    "condition" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FamilyHistoryEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Condition_userId_idx" ON "Condition"("userId");

-- CreateIndex
CREATE INDEX "FamilyHistoryEntry_userId_idx" ON "FamilyHistoryEntry"("userId");

-- AddForeignKey
ALTER TABLE "Condition" ADD CONSTRAINT "Condition_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyHistoryEntry" ADD CONSTRAINT "FamilyHistoryEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
