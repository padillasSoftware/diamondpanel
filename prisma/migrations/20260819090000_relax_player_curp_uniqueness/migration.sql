-- DropIndex
DROP INDEX "Player_curp_key";

-- CreateIndex
CREATE INDEX "Player_curp_idx" ON "Player"("curp");
