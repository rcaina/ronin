-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('FREE', 'PREMIUM');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELED');

-- AlterTable
ALTER TABLE "accounts" ADD COLUMN     "complimentaryAccess" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "currentPeriodEnd" TIMESTAMP(3),
ADD COLUMN     "plan" "Plan" NOT NULL DEFAULT 'FREE',
ADD COLUMN     "stripeCustomerId" TEXT,
ADD COLUMN     "stripeSubscriptionId" TEXT,
ADD COLUMN     "subscriptionStatus" "SubscriptionStatus";

-- CreateIndex
CREATE UNIQUE INDEX "accounts_stripeCustomerId_key" ON "accounts"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_stripeSubscriptionId_key" ON "accounts"("stripeSubscriptionId");
