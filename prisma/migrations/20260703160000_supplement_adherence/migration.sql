-- Additive only: new nullable columns on Supplement + new SupplementLog table.

ALTER TABLE "Supplement" ADD COLUMN "timesPerDay" INTEGER;
ALTER TABLE "Supplement" ADD COLUMN "timing" TEXT;

CREATE TABLE "SupplementLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "supplementId" TEXT NOT NULL,
    "takenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplementLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SupplementLog_userId_idx" ON "SupplementLog"("userId");
CREATE INDEX "SupplementLog_supplementId_idx" ON "SupplementLog"("supplementId");

ALTER TABLE "SupplementLog" ADD CONSTRAINT "SupplementLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupplementLog" ADD CONSTRAINT "SupplementLog_supplementId_fkey" FOREIGN KEY ("supplementId") REFERENCES "Supplement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
