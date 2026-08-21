ALTER TABLE "GameResult"
ADD COLUMN "winningPitcherName" TEXT,
ADD COLUMN "losingPitcherName" TEXT;

UPDATE "GameResult"
SET "winningPitcherName" = CONCAT_WS(' ', "Player"."firstName", "Player"."lastName")
FROM "Player"
WHERE "GameResult"."winningPitcherId" = "Player"."id"
  AND "GameResult"."winningPitcherName" IS NULL;

UPDATE "GameResult"
SET "losingPitcherName" = CONCAT_WS(' ', "Player"."firstName", "Player"."lastName")
FROM "Player"
WHERE "GameResult"."losingPitcherId" = "Player"."id"
  AND "GameResult"."losingPitcherName" IS NULL;

ALTER TABLE "GameBattingHighlight"
ADD COLUMN "playerName" TEXT;

UPDATE "GameBattingHighlight"
SET "playerName" = CONCAT_WS(' ', "Player"."firstName", "Player"."lastName")
FROM "Player"
WHERE "GameBattingHighlight"."playerId" = "Player"."id";

UPDATE "GameBattingHighlight"
SET "playerName" = 'Jugador'
WHERE "playerName" IS NULL
  OR BTRIM("playerName") = '';

ALTER TABLE "GameBattingHighlight"
DROP CONSTRAINT "GameBattingHighlight_playerId_fkey";

ALTER TABLE "GameBattingHighlight"
ALTER COLUMN "playerName" SET NOT NULL,
ALTER COLUMN "playerId" DROP NOT NULL;

ALTER TABLE "GameBattingHighlight"
ADD CONSTRAINT "GameBattingHighlight_playerId_fkey"
FOREIGN KEY ("playerId") REFERENCES "Player"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
