CREATE TABLE "LeagueSettings" (
  "id" TEXT NOT NULL DEFAULT 'default',
  "primaryLogoUrl" TEXT,
  "secondaryLogoUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "LeagueSettings_pkey" PRIMARY KEY ("id")
);
