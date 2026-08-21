CREATE TYPE "GameBattingHighlightSide" AS ENUM ('WINNER', 'LOSER');

ALTER TABLE "GameResult"
ADD COLUMN "winningPitcherId" TEXT,
ADD COLUMN "losingPitcherId" TEXT;

CREATE TABLE "GameBattingHighlight" (
    "id" TEXT NOT NULL,
    "gameResultId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "side" "GameBattingHighlightSide" NOT NULL,
    "order" INTEGER NOT NULL,
    "atBats" INTEGER NOT NULL,
    "hits" INTEGER NOT NULL,
    "homeRuns" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameBattingHighlight_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "GameResult_winningPitcherId_idx" ON "GameResult"("winningPitcherId");
CREATE INDEX "GameResult_losingPitcherId_idx" ON "GameResult"("losingPitcherId");

CREATE UNIQUE INDEX "GameBattingHighlight_gameResultId_side_order_key" ON "GameBattingHighlight"("gameResultId", "side", "order");
CREATE INDEX "GameBattingHighlight_gameResultId_idx" ON "GameBattingHighlight"("gameResultId");
CREATE INDEX "GameBattingHighlight_teamId_idx" ON "GameBattingHighlight"("teamId");
CREATE INDEX "GameBattingHighlight_playerId_idx" ON "GameBattingHighlight"("playerId");
CREATE INDEX "GameBattingHighlight_side_idx" ON "GameBattingHighlight"("side");

ALTER TABLE "GameResult" ADD CONSTRAINT "GameResult_winningPitcherId_fkey" FOREIGN KEY ("winningPitcherId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GameResult" ADD CONSTRAINT "GameResult_losingPitcherId_fkey" FOREIGN KEY ("losingPitcherId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "GameBattingHighlight" ADD CONSTRAINT "GameBattingHighlight_gameResultId_fkey" FOREIGN KEY ("gameResultId") REFERENCES "GameResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GameBattingHighlight" ADD CONSTRAINT "GameBattingHighlight_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GameBattingHighlight" ADD CONSTRAINT "GameBattingHighlight_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
