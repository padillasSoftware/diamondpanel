CREATE TABLE "LeagueCategorySetting" (
  "category" "TeamCategory" NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "LeagueCategorySetting_pkey" PRIMARY KEY ("category")
);

INSERT INTO "LeagueCategorySetting" ("category", "active", "createdAt", "updatedAt")
VALUES
  ('A', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('B', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('C', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('D', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('E', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('R', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("category") DO NOTHING;
