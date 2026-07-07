-- AlterEnum
ALTER TYPE "SubscriptionStatus" ADD VALUE 'TRIALING';

-- AlterTable
ALTER TABLE "accounts" ADD COLUMN     "trialEnd" TIMESTAMP(3);
