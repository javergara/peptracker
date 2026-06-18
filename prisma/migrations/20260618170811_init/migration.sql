-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL DEFAULT 'Me',
    "email" TEXT,
    "weightUnit" TEXT NOT NULL DEFAULT 'kg',
    "doseUnit" TEXT NOT NULL DEFAULT 'mcg',
    "theme" TEXT NOT NULL DEFAULT 'system',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Peptide" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "aliases" JSONB NOT NULL,
    "category" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "mechanism" TEXT NOT NULL,
    "benefits" JSONB NOT NULL,
    "risks" JSONB NOT NULL,
    "sideEffects" JSONB NOT NULL,
    "dosage" JSONB NOT NULL,
    "route" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "halfLife" TEXT NOT NULL,
    "cycleLength" TEXT NOT NULL,
    "reconstitution" JSONB NOT NULL,
    "storage" TEXT NOT NULL,
    "contraindications" JSONB NOT NULL,
    "interactions" JSONB NOT NULL,
    "references" JSONB NOT NULL,
    "tags" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'research',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PeptideInteraction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "peptideAId" TEXT NOT NULL,
    "peptideBId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    CONSTRAINT "PeptideInteraction_peptideAId_fkey" FOREIGN KEY ("peptideAId") REFERENCES "Peptide" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PeptideInteraction_peptideBId_fkey" FOREIGN KEY ("peptideBId") REFERENCES "Peptide" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Stack" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "goal" TEXT,
    "description" TEXT NOT NULL,
    "isPreset" BOOLEAN NOT NULL DEFAULT false,
    "tags" JSONB,
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Stack_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StackItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "stackId" TEXT NOT NULL,
    "peptideId" TEXT NOT NULL,
    "dose" TEXT,
    "frequency" TEXT,
    "timing" TEXT,
    "notes" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "StackItem_stackId_fkey" FOREIGN KEY ("stackId") REFERENCES "Stack" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StackItem_peptideId_fkey" FOREIGN KEY ("peptideId") REFERENCES "Peptide" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Cycle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "peptideId" TEXT,
    "stackId" TEXT,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'planned',
    "scheduleConfig" JSONB,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Cycle_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Cycle_peptideId_fkey" FOREIGN KEY ("peptideId") REFERENCES "Peptide" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Cycle_stackId_fkey" FOREIGN KEY ("stackId") REFERENCES "Stack" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DoseLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cycleId" TEXT,
    "peptideId" TEXT NOT NULL,
    "takenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "amount" REAL NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'mcg',
    "route" TEXT,
    "site" TEXT,
    "notes" TEXT,
    CONSTRAINT "DoseLog_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "Cycle" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DoseLog_peptideId_fkey" FOREIGN KEY ("peptideId") REFERENCES "Peptide" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Measurement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "label" TEXT,
    "value" REAL NOT NULL,
    "unit" TEXT,
    "recordedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Measurement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "JournalEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "body" TEXT NOT NULL,
    "tags" JSONB,
    "cycleId" TEXT,
    CONSTRAINT "JournalEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Peptide_slug_key" ON "Peptide"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "PeptideInteraction_peptideAId_peptideBId_key" ON "PeptideInteraction"("peptideAId", "peptideBId");

-- CreateIndex
CREATE UNIQUE INDEX "Stack_slug_key" ON "Stack"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "StackItem_stackId_peptideId_key" ON "StackItem"("stackId", "peptideId");
