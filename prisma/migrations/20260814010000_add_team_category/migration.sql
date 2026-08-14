CREATE TYPE "TeamCategory" AS ENUM ('A', 'B');

ALTER TABLE "Team"
ADD COLUMN "category" "TeamCategory" NOT NULL DEFAULT 'A';

CREATE INDEX "Team_category_status_idx" ON "Team"("category", "status");
