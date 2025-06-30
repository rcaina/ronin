/*
  Warnings:

  - The values [PERCENTAGE] on the enum `StrategyType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
ALTER TYPE "PeriodType" ADD VALUE 'DAILY';

-- AlterEnum
BEGIN;
CREATE TYPE "StrategyType_new" AS ENUM ('ZERO_SUM', 'FIFTY_THIRTY_TWENTY');
ALTER TABLE "budgets" ALTER COLUMN "strategy" TYPE "StrategyType_new" USING ("strategy"::text::"StrategyType_new");
ALTER TYPE "StrategyType" RENAME TO "StrategyType_old";
ALTER TYPE "StrategyType_new" RENAME TO "StrategyType";
DROP TYPE "StrategyType_old";
COMMIT;
