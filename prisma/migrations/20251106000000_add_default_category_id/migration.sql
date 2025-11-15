-- AlterTable
ALTER TABLE "category" ADD COLUMN "defaultCategoryId" TEXT;

-- CreateIndex
CREATE INDEX "category_defaultCategoryId_idx" ON "category"("defaultCategoryId");

-- AddForeignKey
ALTER TABLE "category" ADD CONSTRAINT "category_defaultCategoryId_fkey" FOREIGN KEY ("defaultCategoryId") REFERENCES "category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Step 1: Update existing budget categories to reference their default category by name and group
-- This matches budget categories (with budgetId) to default categories (without budgetId) by name and group
UPDATE "category" AS budget_cat
SET "defaultCategoryId" = default_cat.id
FROM "category" AS default_cat
WHERE budget_cat."budgetId" IS NOT NULL
  AND budget_cat."defaultCategoryId" IS NULL
  AND default_cat."budgetId" IS NULL
  AND budget_cat."name" = default_cat."name"
  AND budget_cat."group" = default_cat."group"
  AND budget_cat."deleted" IS NULL
  AND default_cat."deleted" IS NULL;

-- Step 2: Create default categories for budget categories that don't have a matching parent
-- For each unique budget category name that doesn't have a default category, create one
DO $$
DECLARE
  budget_cat RECORD;
  new_default_id TEXT;
BEGIN
  FOR budget_cat IN
    SELECT DISTINCT ON (name, "group")
      name,
      "group"
    FROM "category"
    WHERE "budgetId" IS NOT NULL
      AND "defaultCategoryId" IS NULL
      AND "deleted" IS NULL
    ORDER BY name, "group", "createdAt"
  LOOP
    -- Check if a default category with this name and group already exists
    IF NOT EXISTS (
      SELECT 1 FROM "category"
      WHERE "budgetId" IS NULL
        AND name = budget_cat.name
        AND "group" = budget_cat."group"
        AND "deleted" IS NULL
    ) THEN
      -- Generate a new ID for the default category
      new_default_id := gen_random_uuid()::TEXT;
      
      -- Create the default category
      INSERT INTO "category" (id, name, "group", "budgetId", "allocatedAmount", "createdAt", "updatedAt", "deleted")
      VALUES (
        new_default_id,
        budget_cat.name,
        budget_cat."group",
        NULL,
        NULL,
        NOW(),
        NOW(),
        NULL
      );
      
      -- Update all budget categories with this name to reference the new default category
      UPDATE "category"
      SET "defaultCategoryId" = new_default_id
      WHERE "budgetId" IS NOT NULL
        AND name = budget_cat.name
        AND "group" = budget_cat."group"
        AND "defaultCategoryId" IS NULL
        AND "deleted" IS NULL;
    END IF;
  END LOOP;
END $$;

