-- Migrate existing income records to transactions
INSERT INTO "transactions" (
    "id",
    "name",
    "description",
    "amount",
    "occurredAt",
    "createdAt",
    "updatedAt",
    "deleted",
    "cardId",
    "budgetId",
    "categoryId",
    "accountId",
    "userId",
    "transactionType",
    "linkedTransactionId"
)
SELECT 
    gen_random_uuid()::text as "id",
    i."source" as "name",
    i."description",
    i."amount",
    COALESCE(i."receivedAt", i."createdAt") as "occurredAt",
    i."createdAt",
    i."updatedAt",
    i."deleted",
    (
        SELECT c."id"
        FROM "card" c
        WHERE c."budgetId" = i."budgetId"
          AND c."cardType" IN ('DEBIT', 'BUSINESS_DEBIT')
          AND c."deleted" IS NULL
        ORDER BY c."createdAt" ASC
        LIMIT 1
    ) as "cardId",
    i."budgetId",
    NULL as "categoryId",
    i."accountId",
    i."userId",
    'INCOME'::"TransactionType" as "transactionType",
    NULL as "linkedTransactionId"
FROM "income" i;

-- Drop the income table after data migration
DROP TABLE IF EXISTS "income";
