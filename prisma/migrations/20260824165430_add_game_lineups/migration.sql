-- CreateTable
CREATE TABLE "GameLineupEntry" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "battingOrder" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameLineupEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GameLineupEntry_gameId_idx" ON "GameLineupEntry"("gameId");

-- CreateIndex
CREATE INDEX "GameLineupEntry_teamId_idx" ON "GameLineupEntry"("teamId");

-- CreateIndex
CREATE INDEX "GameLineupEntry_playerId_idx" ON "GameLineupEntry"("playerId");

-- CreateIndex
CREATE INDEX "GameLineupEntry_teamId_playerId_idx" ON "GameLineupEntry"("teamId", "playerId");

-- CreateIndex
CREATE UNIQUE INDEX "GameLineupEntry_gameId_playerId_key" ON "GameLineupEntry"("gameId", "playerId");

-- CreateIndex
CREATE UNIQUE INDEX "GameLineupEntry_gameId_teamId_battingOrder_key" ON "GameLineupEntry"("gameId", "teamId", "battingOrder");

-- AddForeignKey
ALTER TABLE "GameLineupEntry" ADD CONSTRAINT "GameLineupEntry_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameLineupEntry" ADD CONSTRAINT "GameLineupEntry_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameLineupEntry" ADD CONSTRAINT "GameLineupEntry_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
