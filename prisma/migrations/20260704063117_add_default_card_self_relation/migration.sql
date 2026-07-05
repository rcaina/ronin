-- AlterTable
ALTER TABLE "card" ADD COLUMN     "defaultCardId" TEXT;

-- CreateIndex
CREATE INDEX "card_defaultCardId_idx" ON "card"("defaultCardId");

-- AddForeignKey
ALTER TABLE "card" ADD CONSTRAINT "card_defaultCardId_fkey" FOREIGN KEY ("defaultCardId") REFERENCES "card"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Step 1: Create one general (template) card per distinct identity among existing
-- budget cards, where identity is scoped to (userId, cardType) and then matched by
-- lastFourDigits when the card has a non-empty lastFourDigits, otherwise by
-- lower(trim(name)). This mirrors the runtime identity used by resolveDefaultCard
-- in lib/api-services/cards.ts. Uses the most recently created card in each group
-- as the source of truth for name/lastFourDigits/spendingLimit. Skip groups that
-- already have a matching general card.
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
  SELECT DISTINCT ON (
    "userId",
    "cardType",
    COALESCE('L:' || NULLIF("lastFourDigits", ''), 'N:' || lower(trim(name)))
  )
    name,
    "lastFourDigits",
    "cardType",
    "spendingLimit",
    "userId"
  FROM "card"
  WHERE "budgetId" IS NOT NULL
    AND deleted IS NULL
  ORDER BY
    "userId",
    "cardType",
    COALESCE('L:' || NULLIF("lastFourDigits", ''), 'N:' || lower(trim(name))),
    "createdAt" DESC
) AS src
WHERE NOT EXISTS (
  SELECT 1 FROM "card" gc
  WHERE gc."budgetId" IS NULL
    AND gc."defaultCardId" IS NULL
    AND gc.deleted IS NULL
    AND gc."userId" = src."userId"
    AND gc."cardType" = src."cardType"
    AND (
      (NULLIF(src."lastFourDigits", '') IS NOT NULL AND gc."lastFourDigits" = src."lastFourDigits")
      OR (NULLIF(src."lastFourDigits", '') IS NULL AND lower(trim(gc.name)) = lower(trim(src.name)))
    )
);

-- Step 2: Link existing budget cards to their matching general card using the same
-- identity: same userId and cardType, then matched by lastFourDigits when the
-- budget card has a non-empty lastFourDigits, otherwise by lower(trim(name)).
UPDATE "card" AS budget_card
SET "defaultCardId" = general_card.id
FROM "card" AS general_card
WHERE budget_card."budgetId" IS NOT NULL
  AND budget_card.deleted IS NULL
  AND general_card."budgetId" IS NULL
  AND general_card."defaultCardId" IS NULL
  AND general_card.deleted IS NULL
  AND general_card."userId" = budget_card."userId"
  AND general_card."cardType" = budget_card."cardType"
  AND (
    (NULLIF(budget_card."lastFourDigits", '') IS NOT NULL AND general_card."lastFourDigits" = budget_card."lastFourDigits")
    OR (NULLIF(budget_card."lastFourDigits", '') IS NULL AND lower(trim(general_card.name)) = lower(trim(budget_card.name)))
  );
