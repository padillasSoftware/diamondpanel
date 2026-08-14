ALTER TYPE "TeamCategory" ADD VALUE IF NOT EXISTS 'C';
ALTER TYPE "TeamCategory" ADD VALUE IF NOT EXISTS 'D';
ALTER TYPE "TeamCategory" ADD VALUE IF NOT EXISTS 'E';
ALTER TYPE "TeamCategory" ADD VALUE IF NOT EXISTS 'R';

CREATE TYPE "TeamBranch" AS ENUM ('VARONIL', 'FEMENIL');

ALTER TABLE "Team"
ADD COLUMN "branch" "TeamBranch" NOT NULL DEFAULT 'VARONIL';

DROP INDEX IF EXISTS "Team_category_status_idx";

CREATE INDEX "Team_category_branch_status_idx" ON "Team"("category", "branch", "status");
