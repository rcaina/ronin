-- CreateTable
CREATE TABLE "savings" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "budgetId" TEXT,
    "deleted" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "savings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pocket" (
    "id" TEXT NOT NULL,
    "savingsId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "goalAmount" DOUBLE PRECISION,
    "goalDate" TIMESTAMP(3),
    "goalNote" TEXT,
    "deleted" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pocket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "allocation" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "pocketId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "allocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "savings_accountId_idx" ON "savings"("accountId");

-- CreateIndex
CREATE INDEX "savings_userId_idx" ON "savings"("userId");

-- CreateIndex
CREATE INDEX "savings_budgetId_idx" ON "savings"("budgetId");

-- CreateIndex
CREATE INDEX "savings_deleted_idx" ON "savings"("deleted");

-- CreateIndex
CREATE INDEX "pocket_savingsId_idx" ON "pocket"("savingsId");

-- CreateIndex
CREATE INDEX "pocket_deleted_idx" ON "pocket"("deleted");

-- CreateIndex
CREATE INDEX "allocation_transactionId_idx" ON "allocation"("transactionId");

-- CreateIndex
CREATE INDEX "allocation_pocketId_idx" ON "allocation"("pocketId");

-- AddForeignKey
ALTER TABLE "savings" ADD CONSTRAINT "savings_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "savings" ADD CONSTRAINT "savings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "savings" ADD CONSTRAINT "savings_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "budgets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pocket" ADD CONSTRAINT "pocket_savingsId_fkey" FOREIGN KEY ("savingsId") REFERENCES "savings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "allocation" ADD CONSTRAINT "allocation_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "allocation" ADD CONSTRAINT "allocation_pocketId_fkey" FOREIGN KEY ("pocketId") REFERENCES "pocket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
