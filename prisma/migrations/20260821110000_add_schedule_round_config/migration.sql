CREATE TABLE "ScheduleRoundConfig" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "category" "TeamCategory" NOT NULL,
    "branch" "TeamBranch" NOT NULL,
    "rounds" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduleRoundConfig_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ScheduleRoundConfig_seasonId_idx" ON "ScheduleRoundConfig"("seasonId");

CREATE UNIQUE INDEX "ScheduleRoundConfig_seasonId_category_branch_key" ON "ScheduleRoundConfig"("seasonId", "category", "branch");

ALTER TABLE "ScheduleRoundConfig" ADD CONSTRAINT "ScheduleRoundConfig_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;
