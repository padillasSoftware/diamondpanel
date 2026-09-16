CREATE TYPE "StandingsSortMode" AS ENUM ('WIN_PERCENTAGE', 'WINS');

ALTER TABLE "LeagueSettings"
ADD COLUMN "standingsSortMode" "StandingsSortMode" NOT NULL DEFAULT 'WIN_PERCENTAGE';
