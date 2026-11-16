-- CreateEnum
CREATE TYPE "BudgetKind" AS ENUM ('CONTINUOUS', 'EVENT');

-- AlterTable
ALTER TABLE "budgets" ADD COLUMN     "kind" "BudgetKind" NOT NULL DEFAULT 'EVENT',
ALTER COLUMN "endAt" DROP NOT NULL;
