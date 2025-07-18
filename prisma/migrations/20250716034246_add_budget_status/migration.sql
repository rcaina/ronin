-- CreateEnum
CREATE TYPE "BudgetStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'ARCHIVED');

-- AlterTable
ALTER TABLE "budgets" ADD COLUMN     "status" "BudgetStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateIndex
CREATE INDEX "budgets_status_idx" ON "budgets"("status");
