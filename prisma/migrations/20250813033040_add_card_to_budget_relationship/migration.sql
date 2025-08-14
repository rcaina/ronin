-- AlterTable
ALTER TABLE "Card" ADD COLUMN     "budgetId" TEXT;

-- CreateIndex
CREATE INDEX "AccountUser_userId_idx" ON "AccountUser"("userId");

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "budgets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
