/*
  Warnings:

  - You are about to drop the `AccountUser` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `BudgetCategory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Card` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Income` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `categories` table. If the table is not empty, all the data it contains will be lost.

*/

-- Step 1: Drop foreign keys to prepare for data migration
-- DropForeignKey
ALTER TABLE "AccountUser" DROP CONSTRAINT "AccountUser_accountId_fkey";

-- DropForeignKey
ALTER TABLE "AccountUser" DROP CONSTRAINT "AccountUser_userId_fkey";

-- DropForeignKey
ALTER TABLE "BudgetCategory" DROP CONSTRAINT "BudgetCategory_budgetId_fkey";

-- DropForeignKey
ALTER TABLE "BudgetCategory" DROP CONSTRAINT "BudgetCategory_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "Card" DROP CONSTRAINT "Card_budgetId_fkey";

-- DropForeignKey
ALTER TABLE "Card" DROP CONSTRAINT "Card_userId_fkey";

-- DropForeignKey
ALTER TABLE "Income" DROP CONSTRAINT "Income_accountId_fkey";

-- DropForeignKey
ALTER TABLE "Income" DROP CONSTRAINT "Income_budgetId_fkey";

-- DropForeignKey
ALTER TABLE "Income" DROP CONSTRAINT "Income_userId_fkey";

-- DropForeignKey
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_cardId_fkey";

-- DropForeignKey
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_categoryId_fkey";

-- Step 2: Create new tables before dropping old ones
-- CreateTable
CREATE TABLE "account_user" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "account_user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "income" (
    "id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "source" TEXT,
    "description" TEXT,
    "isPlanned" BOOLEAN NOT NULL DEFAULT false,
    "frequency" "PeriodType" NOT NULL,
    "accountId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "budgetId" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted" TIMESTAMP(3),

    CONSTRAINT "income_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "category" (
    "id" TEXT NOT NULL,
    "budgetId" TEXT,
    "name" TEXT NOT NULL,
    "group" "CategoryType" NOT NULL,
    "allocatedAmount" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted" TIMESTAMP(3),

    CONSTRAINT "category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "card" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cardType" "CardType" NOT NULL,
    "amountSpent" DOUBLE PRECISION,
    "spendingLimit" DOUBLE PRECISION,
    "budgetId" TEXT,
    "userId" TEXT NOT NULL,
    "deleted" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "card_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "account_user_accountId_idx" ON "account_user"("accountId");

-- CreateIndex
CREATE INDEX "account_user_userId_idx" ON "account_user"("userId");

-- CreateIndex
CREATE INDEX "income_id_idx" ON "income"("id");

-- CreateIndex
CREATE INDEX "category_id_idx" ON "category"("id");

-- CreateIndex
CREATE INDEX "category_budgetId_idx" ON "category"("budgetId");

-- CreateIndex
CREATE INDEX "category_deleted_idx" ON "category"("deleted");

-- CreateIndex
CREATE INDEX "card_id_idx" ON "card"("id");

-- Step 3: Migrate data from old tables to new tables
-- Migrate AccountUser data
INSERT INTO "account_user" ("id", "accountId", "userId")
SELECT "id", "accountId", "userId"
FROM "AccountUser";

-- Migrate Income data
INSERT INTO "income" ("id", "amount", "source", "description", "isPlanned", "frequency", "accountId", "userId", "budgetId", "receivedAt", "createdAt", "updatedAt", "deleted")
SELECT "id", "amount", "source", "description", "isPlanned", "frequency", "accountId", "userId", "budgetId", "receivedAt", "createdAt", "updatedAt", "deleted"
FROM "Income";

-- Migrate Card data
INSERT INTO "card" ("id", "name", "cardType", "amountSpent", "spendingLimit", "budgetId", "userId", "deleted", "createdAt", "updatedAt")
SELECT "id", "name", "cardType", "amountSpent", "spendingLimit", "budgetId", "userId", "deleted", "createdAt", "updatedAt"
FROM "Card";

-- Migrate Category data: merge BudgetCategory and categories tables
INSERT INTO "category" ("id", "budgetId", "name", "group", "allocatedAmount", "createdAt", "updatedAt", "deleted")
SELECT 
    bc."id",
    bc."budgetId",
    c."name",
    c."group",
    bc."allocatedAmount",
    bc."createdAt",
    bc."updatedAt",
    bc."deleted"
FROM "BudgetCategory" bc
INNER JOIN "categories" c ON bc."categoryId" = c."id";

-- Step 4: Drop old tables now that data has been migrated
-- DropTable
DROP TABLE "AccountUser";

-- DropTable
DROP TABLE "BudgetCategory";

-- DropTable
DROP TABLE "Card";

-- DropTable
DROP TABLE "Income";

-- DropTable
DROP TABLE "categories";

-- Step 5: Add foreign key constraints back
-- AddForeignKey
ALTER TABLE "account_user" ADD CONSTRAINT "account_user_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_user" ADD CONSTRAINT "account_user_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "income" ADD CONSTRAINT "income_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "income" ADD CONSTRAINT "income_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "income" ADD CONSTRAINT "income_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "budgets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category" ADD CONSTRAINT "category_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "budgets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card" ADD CONSTRAINT "card_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "budgets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card" ADD CONSTRAINT "card_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "card"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
