-- DropIndex
DROP INDEX "email_tokens_email_purpose_idx";

-- CreateIndex
CREATE UNIQUE INDEX "email_tokens_email_purpose_key" ON "email_tokens"("email", "purpose");

