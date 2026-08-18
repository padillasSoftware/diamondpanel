-- CreateTable
CREATE TABLE "TeamManager" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamManager_pkey" PRIMARY KEY ("id")
);

-- Backfill existing one-team manager assignments.
INSERT INTO "TeamManager" ("id", "userId", "teamId", "createdAt", "updatedAt")
SELECT
    'team_manager_' || md5("User"."id" || ':' || "User"."managedTeamId"),
    "User"."id",
    "User"."managedTeamId",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "User"
WHERE "User"."managedTeamId" IS NOT NULL
ON CONFLICT DO NOTHING;

-- CreateIndex
CREATE INDEX "TeamManager_teamId_idx" ON "TeamManager"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamManager_userId_teamId_key" ON "TeamManager"("userId", "teamId");

-- AddForeignKey
ALTER TABLE "TeamManager" ADD CONSTRAINT "TeamManager_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamManager" ADD CONSTRAINT "TeamManager_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
