-- Additive only: new nullable columns + new CheckIn table. Safe on live data.

-- Peptide: numeric half-life for the PK/active-levels chart
ALTER TABLE "Peptide" ADD COLUMN "halfLifeHours" DOUBLE PRECISION;

-- Cost tracking
ALTER TABLE "Vial" ADD COLUMN "price" DOUBLE PRECISION;
ALTER TABLE "StockItem" ADD COLUMN "price" DOUBLE PRECISION;

-- Washout planning
ALTER TABLE "Cycle" ADD COLUMN "washoutDays" INTEGER;

-- Daily check-in
CREATE TABLE "CheckIn" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "ratings" JSONB NOT NULL,
    "sideEffects" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CheckIn_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CheckIn_userId_date_key" ON "CheckIn"("userId", "date");
CREATE INDEX "CheckIn_userId_idx" ON "CheckIn"("userId");

ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
