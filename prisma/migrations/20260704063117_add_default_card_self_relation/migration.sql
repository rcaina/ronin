-- AlterTable
ALTER TABLE "card" ADD COLUMN     "defaultCardId" TEXT;

-- CreateIndex
CREATE INDEX "card_defaultCardId_idx" ON "card"("defaultCardId");

-- AddForeignKey
ALTER TABLE "card" ADD CONSTRAINT "card_defaultCardId_fkey" FOREIGN KEY ("defaultCardId") REFERENCES "card"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Step 1: Create one general (template) card per distinct (userId, lower(trim(name)))
-- among existing budget cards, using the most recently created card in each group
-- as the source of truth for lastFourDigits/cardType/spendingLimit. Skip groups
-- that already have a matching general card.
INSERT INTO "card" (id, name, "lastFourDigits", "cardType", "spendingLimit", "userId", "budgetId", "amountSpent", "createdAt", "updatedAt", "deleted")
SELECT
  gen_random_uuid()::text,
  src.name,
  src."lastFourDigits",
  src."cardType",
  src."spendingLimit",
  src."userId",
  NULL,
  NULL,
  now(),
  now(),
  NULL
FROM (
  SELECT DISTINCT ON ("userId", lower(trim(name)))
    name,
    "lastFourDigits",
    "cardType",
    "spendingLimit",
    "userId"
  FROM "card"
  WHERE "budgetId" IS NOT NULL
    AND deleted IS NULL
  ORDER BY "userId", lower(trim(name)), "createdAt" DESC
) AS src
WHERE NOT EXISTS (
  SELECT 1 FROM "card" gc
  WHERE gc."budgetId" IS NULL
    AND gc."defaultCardId" IS NULL
    AND gc.deleted IS NULL
    AND gc."userId" = src."userId"
    AND lower(trim(gc.name)) = lower(trim(src.name))
);

-- Step 2: Link existing budget cards to their matching general card
UPDATE "card" AS budget_card
SET "defaultCardId" = general_card.id
FROM "card" AS general_card
WHERE budget_card."budgetId" IS NOT NULL
  AND budget_card.deleted IS NULL
  AND general_card."budgetId" IS NULL
  AND general_card."defaultCardId" IS NULL
  AND general_card.deleted IS NULL
  AND general_card."userId" = budget_card."userId"
  AND lower(trim(general_card.name)) = lower(trim(budget_card.name));
