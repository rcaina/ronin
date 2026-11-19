-- AlterTable
ALTER TABLE "category" ADD COLUMN     "accountId" TEXT;

-- CreateIndex
CREATE INDEX "category_accountId_idx" ON "category"("accountId");

-- AddForeignKey
ALTER TABLE "category" ADD CONSTRAINT "category_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
