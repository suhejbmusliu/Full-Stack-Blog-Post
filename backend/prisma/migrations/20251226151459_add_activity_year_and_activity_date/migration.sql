-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "activityDate" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ActivityYear" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityYear_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ActivityYear_year_key" ON "ActivityYear"("year");

-- CreateIndex
CREATE INDEX "ActivityYear_year_idx" ON "ActivityYear"("year");
