/*
  Warnings:

  - Added the required column `companyId` to the `SkillMatchResult` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "SkillMatchResult" ADD COLUMN     "companyId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "SkillMatchResult" ADD CONSTRAINT "SkillMatchResult_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
