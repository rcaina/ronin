-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "recurringTransactionId" TEXT;

-- CreateTable
CREATE TABLE "recurring_transactions" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "transactionType" "TransactionType" NOT NULL DEFAULT 'REGULAR',
    "categoryId" TEXT,
    "cardId" TEXT,
    "accountId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "frequency" "PeriodType" NOT NULL,
    "nextRunAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3),
    "paused" BOOLEAN NOT NULL DEFAULT false,
    "deleted" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recurring_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "recurring_transactions_accountId_idx" ON "recurring_transactions"("accountId");

-- CreateIndex
CREATE INDEX "recurring_transactions_userId_idx" ON "recurring_transactions"("userId");

-- CreateIndex
CREATE INDEX "recurring_transactions_categoryId_idx" ON "recurring_transactions"("categoryId");

-- CreateIndex
CREATE INDEX "recurring_transactions_cardId_idx" ON "recurring_transactions"("cardId");

-- CreateIndex
CREATE INDEX "recurring_transactions_nextRunAt_idx" ON "recurring_transactions"("nextRunAt");

-- CreateIndex
CREATE INDEX "recurring_transactions_paused_idx" ON "recurring_transactions"("paused");

-- CreateIndex
CREATE INDEX "recurring_transactions_deleted_idx" ON "recurring_transactions"("deleted");

-- CreateIndex
CREATE INDEX "transactions_recurringTransactionId_idx" ON "transactions"("recurringTransactionId");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_recurringTransactionId_occurredAt_key" ON "transactions"("recurringTransactionId", "occurredAt");

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_recurringTransactionId_fkey" FOREIGN KEY ("recurringTransactionId") REFERENCES "recurring_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_transactions" ADD CONSTRAINT "recurring_transactions_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_transactions" ADD CONSTRAINT "recurring_transactions_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "card"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_transactions" ADD CONSTRAINT "recurring_transactions_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_transactions" ADD CONSTRAINT "recurring_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

