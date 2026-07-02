-- CreateTable
CREATE TABLE "StockItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "peptideId" TEXT NOT NULL,
    "vialMcg" DOUBLE PRECISION NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "dose" DOUBLE PRECISION,
    "doseUnit" TEXT NOT NULL DEFAULT 'mcg',
    "frequency" TEXT NOT NULL DEFAULT 'daily',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StockItem_userId_idx" ON "StockItem"("userId");

-- AddForeignKey
ALTER TABLE "StockItem" ADD CONSTRAINT "StockItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockItem" ADD CONSTRAINT "StockItem_peptideId_fkey" FOREIGN KEY ("peptideId") REFERENCES "Peptide"("id") ON DELETE CASCADE ON UPDATE CASCADE;
