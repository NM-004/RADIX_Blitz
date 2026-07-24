-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanySkillExpectation" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "categoryCode" TEXT NOT NULL,
    "expectedLevel" INTEGER NOT NULL,

    CONSTRAINT "CompanySkillExpectation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateProfile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "education" TEXT,
    "cvFile" TEXT,
    "hackathons" TEXT[],
    "internships" TEXT[],
    "certifications" TEXT[],
    "preferredRoles" TEXT[],

    CONSTRAINT "CandidateProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateSkill" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "skillName" TEXT NOT NULL,
    "categoryCode" TEXT NOT NULL,
    "evidence" TEXT,
    "confidence" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 5,

    CONSTRAINT "CandidateSkill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobDescription" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "sourceFile" TEXT NOT NULL,

    CONSTRAINT "JobDescription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JDSkill" (
    "id" TEXT NOT NULL,
    "jdId" TEXT NOT NULL,
    "skillName" TEXT NOT NULL,
    "categoryCode" TEXT NOT NULL,
    "evidence" TEXT,
    "confidence" TEXT NOT NULL,

    CONSTRAINT "JDSkill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TalentCheckResult" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "readinessScore" INTEGER NOT NULL,
    "gapDetails" JSONB NOT NULL,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TalentCheckResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkillMatchResult" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "jdId" TEXT NOT NULL,
    "matchScore" INTEGER NOT NULL,
    "matchedSkills" JSONB NOT NULL,
    "missingSkills" JSONB NOT NULL,
    "matchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SkillMatchResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Company_name_key" ON "Company"("name");

-- CreateIndex
CREATE UNIQUE INDEX "CompanySkillExpectation_roleId_categoryCode_key" ON "CompanySkillExpectation"("roleId", "categoryCode");

-- CreateIndex
CREATE UNIQUE INDEX "CandidateProfile_email_key" ON "CandidateProfile"("email");

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanySkillExpectation" ADD CONSTRAINT "CompanySkillExpectation_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateSkill" ADD CONSTRAINT "CandidateSkill_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobDescription" ADD CONSTRAINT "JobDescription_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JDSkill" ADD CONSTRAINT "JDSkill_jdId_fkey" FOREIGN KEY ("jdId") REFERENCES "JobDescription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TalentCheckResult" ADD CONSTRAINT "TalentCheckResult_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TalentCheckResult" ADD CONSTRAINT "TalentCheckResult_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillMatchResult" ADD CONSTRAINT "SkillMatchResult_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillMatchResult" ADD CONSTRAINT "SkillMatchResult_jdId_fkey" FOREIGN KEY ("jdId") REFERENCES "JobDescription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
