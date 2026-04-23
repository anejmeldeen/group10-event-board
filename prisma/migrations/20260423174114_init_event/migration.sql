-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT NOT NULL,
    "organizerId" TEXT NOT NULL,
    "organizerName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "capacity" INTEGER NOT NULL DEFAULT 0,
    "attendeeCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TEXT NOT NULL,
    "updatedAt" TEXT NOT NULL
);
