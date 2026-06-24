-- CreateTable
CREATE TABLE "Vial" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "peptideId" TEXT NOT NULL,
    "label" TEXT,
    "totalMcg" REAL NOT NULL,
    "bacWaterMl" REAL,
    "concentrationMcgPerMl" REAL,
    "remainingMcg" REAL NOT NULL,
    "reconstitutedAt" DATETIME,
    "expiresAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'sealed',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Vial_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Vial_peptideId_fkey" FOREIGN KEY ("peptideId") REFERENCES "Peptide" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LabResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "marker" TEXT NOT NULL,
    "value" REAL NOT NULL,
    "unit" TEXT,
    "refLow" REAL,
    "refHigh" REAL,
    "takenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cycleId" TEXT,
    "notes" TEXT,
    CONSTRAINT "LabResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Photo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "caption" TEXT,
    "takenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tags" JSONB,
    CONSTRAINT "Photo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DoseLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "cycleId" TEXT,
    "peptideId" TEXT NOT NULL,
    "vialId" TEXT,
    "takenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "amount" REAL NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'mcg',
    "route" TEXT,
    "site" TEXT,
    "mood" INTEGER,
    "energy" INTEGER,
    "sideEffects" JSONB,
    "notes" TEXT,
    CONSTRAINT "DoseLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DoseLog_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "Cycle" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DoseLog_peptideId_fkey" FOREIGN KEY ("peptideId") REFERENCES "Peptide" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DoseLog_vialId_fkey" FOREIGN KEY ("vialId") REFERENCES "Vial" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_DoseLog" ("amount", "cycleId", "id", "notes", "peptideId", "route", "site", "takenAt", "unit", "userId") SELECT "amount", "cycleId", "id", "notes", "peptideId", "route", "site", "takenAt", "unit", "userId" FROM "DoseLog";
DROP TABLE "DoseLog";
ALTER TABLE "new_DoseLog" RENAME TO "DoseLog";
CREATE INDEX "DoseLog_userId_idx" ON "DoseLog"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Vial_userId_idx" ON "Vial"("userId");

-- CreateIndex
CREATE INDEX "LabResult_userId_idx" ON "LabResult"("userId");

-- CreateIndex
CREATE INDEX "Photo_userId_idx" ON "Photo"("userId");
