-- AlterTable
ALTER TABLE "User" ADD COLUMN "color" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DoseLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "cycleId" TEXT,
    "peptideId" TEXT NOT NULL,
    "takenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "amount" REAL NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'mcg',
    "route" TEXT,
    "site" TEXT,
    "notes" TEXT,
    CONSTRAINT "DoseLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DoseLog_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "Cycle" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DoseLog_peptideId_fkey" FOREIGN KEY ("peptideId") REFERENCES "Peptide" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_DoseLog" ("amount", "cycleId", "id", "notes", "peptideId", "route", "site", "takenAt", "unit") SELECT "amount", "cycleId", "id", "notes", "peptideId", "route", "site", "takenAt", "unit" FROM "DoseLog";
DROP TABLE "DoseLog";
ALTER TABLE "new_DoseLog" RENAME TO "DoseLog";
CREATE INDEX "DoseLog_userId_idx" ON "DoseLog"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
