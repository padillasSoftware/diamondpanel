-- AlterTable
ALTER TABLE "Player" ADD COLUMN "curp" TEXT,
ADD COLUMN "birthDate" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Player_curp_key" ON "Player"("curp");