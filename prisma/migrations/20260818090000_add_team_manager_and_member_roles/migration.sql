CREATE TYPE "TeamMemberRole" AS ENUM ('PLAYER', 'MANAGER', 'COACH');

ALTER TABLE "User"
ADD COLUMN "managedTeamId" TEXT;

ALTER TABLE "Player"
ADD COLUMN "memberRole" "TeamMemberRole" NOT NULL DEFAULT 'PLAYER';

CREATE INDEX "User_managedTeamId_idx" ON "User"("managedTeamId");

CREATE INDEX "Player_teamId_memberRole_status_idx" ON "Player"("teamId", "memberRole", "status");

ALTER TABLE "User"
ADD CONSTRAINT "User_managedTeamId_fkey" FOREIGN KEY ("managedTeamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
