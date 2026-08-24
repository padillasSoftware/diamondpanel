-- CreateEnum
CREATE TYPE "PlayoffEligibilityMode" AS ENUM ('LINEUP_GAMES', 'OPEN_ROSTER');

-- AlterTable
ALTER TABLE "Season" ADD COLUMN     "playoffEligibilityMode" "PlayoffEligibilityMode" NOT NULL DEFAULT 'LINEUP_GAMES',
ADD COLUMN     "playoffMinimumLineupGames" INTEGER NOT NULL DEFAULT 5;
