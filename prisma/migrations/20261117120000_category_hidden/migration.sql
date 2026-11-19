-- AlterTable
ALTER TABLE "category" ADD COLUMN     "hiddenFrom" DATE;

-- AlterTable
ALTER TABLE "category_month" ADD COLUMN     "hidden" BOOLEAN NOT NULL DEFAULT false;

