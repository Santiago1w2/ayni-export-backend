-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'BLOCKED');

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'ADMIN';

-- DropForeignKey
ALTER TABLE "Agreement" DROP CONSTRAINT "Agreement_requestId_fkey";

-- DropForeignKey
ALTER TABLE "BuyingInterest" DROP CONSTRAINT "BuyingInterest_importerCompanyId_fkey";

-- DropForeignKey
ALTER TABLE "Company" DROP CONSTRAINT "Company_ownerUserId_fkey";

-- DropForeignKey
ALTER TABLE "CompanyVerification" DROP CONSTRAINT "CompanyVerification_companyId_fkey";

-- DropForeignKey
ALTER TABLE "DocumentAnalysis" DROP CONSTRAINT "DocumentAnalysis_submissionId_fkey";

-- DropForeignKey
ALTER TABLE "DocumentRequirement" DROP CONSTRAINT "DocumentRequirement_formId_fkey";

-- DropForeignKey
ALTER TABLE "DocumentSubmission" DROP CONSTRAINT "DocumentSubmission_documentRequirementId_fkey";

-- DropForeignKey
ALTER TABLE "DocumentSubmission" DROP CONSTRAINT "DocumentSubmission_requestId_fkey";

-- DropForeignKey
ALTER TABLE "DocumentSubmission" DROP CONSTRAINT "DocumentSubmission_uploaderCompanyId_fkey";

-- DropForeignKey
ALTER TABLE "ExportOffer" DROP CONSTRAINT "ExportOffer_exporterCompanyId_fkey";

-- DropForeignKey
ALTER TABLE "ExportRequest" DROP CONSTRAINT "ExportRequest_buyingInterestId_fkey";

-- DropForeignKey
ALTER TABLE "ExportRequest" DROP CONSTRAINT "ExportRequest_importerCompanyId_fkey";

-- DropForeignKey
ALTER TABLE "ExportRequest" DROP CONSTRAINT "ExportRequest_offerId_fkey";

-- DropForeignKey
ALTER TABLE "ExportRequest" DROP CONSTRAINT "ExportRequest_requirementFormId_fkey";

-- DropForeignKey
ALTER TABLE "RequestFieldResponse" DROP CONSTRAINT "RequestFieldResponse_fieldId_fkey";

-- DropForeignKey
ALTER TABLE "RequestFieldResponse" DROP CONSTRAINT "RequestFieldResponse_requestId_fkey";

-- DropForeignKey
ALTER TABLE "RequestStatusHistory" DROP CONSTRAINT "RequestStatusHistory_actorUserId_fkey";

-- DropForeignKey
ALTER TABLE "RequestStatusHistory" DROP CONSTRAINT "RequestStatusHistory_requestId_fkey";

-- DropForeignKey
ALTER TABLE "RequirementField" DROP CONSTRAINT "RequirementField_formId_fkey";

-- DropForeignKey
ALTER TABLE "RequirementForm" DROP CONSTRAINT "RequirementForm_buyingInterestId_fkey";

-- DropForeignKey
ALTER TABLE "RequirementForm" DROP CONSTRAINT "RequirementForm_importerCompanyId_fkey";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "accountStatus" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "emailVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastLoginAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "EmailVerification" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminAuditLog" (
    "id" UUID NOT NULL,
    "adminUserId" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" UUID NOT NULL,
    "agreementId" UUID NOT NULL,
    "authorCompanyId" UUID NOT NULL,
    "targetCompanyId" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmailVerification_userId_createdAt_idx" ON "EmailVerification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AdminAuditLog_createdAt_idx" ON "AdminAuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "Review_targetCompanyId_createdAt_idx" ON "Review"("targetCompanyId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Review_agreementId_authorCompanyId_key" ON "Review"("agreementId", "authorCompanyId");

-- CreateIndex
CREATE INDEX "Notification_userId_read_createdAt_idx" ON "Notification"("userId", "read", "createdAt");

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyVerification" ADD CONSTRAINT "CompanyVerification_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuyingInterest" ADD CONSTRAINT "BuyingInterest_importerCompanyId_fkey" FOREIGN KEY ("importerCompanyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequirementForm" ADD CONSTRAINT "RequirementForm_importerCompanyId_fkey" FOREIGN KEY ("importerCompanyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequirementForm" ADD CONSTRAINT "RequirementForm_buyingInterestId_fkey" FOREIGN KEY ("buyingInterestId") REFERENCES "BuyingInterest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequirementField" ADD CONSTRAINT "RequirementField_formId_fkey" FOREIGN KEY ("formId") REFERENCES "RequirementForm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentRequirement" ADD CONSTRAINT "DocumentRequirement_formId_fkey" FOREIGN KEY ("formId") REFERENCES "RequirementForm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExportOffer" ADD CONSTRAINT "ExportOffer_exporterCompanyId_fkey" FOREIGN KEY ("exporterCompanyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExportRequest" ADD CONSTRAINT "ExportRequest_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "ExportOffer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExportRequest" ADD CONSTRAINT "ExportRequest_importerCompanyId_fkey" FOREIGN KEY ("importerCompanyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExportRequest" ADD CONSTRAINT "ExportRequest_buyingInterestId_fkey" FOREIGN KEY ("buyingInterestId") REFERENCES "BuyingInterest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExportRequest" ADD CONSTRAINT "ExportRequest_requirementFormId_fkey" FOREIGN KEY ("requirementFormId") REFERENCES "RequirementForm"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestStatusHistory" ADD CONSTRAINT "RequestStatusHistory_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ExportRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestStatusHistory" ADD CONSTRAINT "RequestStatusHistory_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestFieldResponse" ADD CONSTRAINT "RequestFieldResponse_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ExportRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestFieldResponse" ADD CONSTRAINT "RequestFieldResponse_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "RequirementField"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentSubmission" ADD CONSTRAINT "DocumentSubmission_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ExportRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentSubmission" ADD CONSTRAINT "DocumentSubmission_documentRequirementId_fkey" FOREIGN KEY ("documentRequirementId") REFERENCES "DocumentRequirement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentSubmission" ADD CONSTRAINT "DocumentSubmission_uploaderCompanyId_fkey" FOREIGN KEY ("uploaderCompanyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentAnalysis" ADD CONSTRAINT "DocumentAnalysis_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "DocumentSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agreement" ADD CONSTRAINT "Agreement_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ExportRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailVerification" ADD CONSTRAINT "EmailVerification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminAuditLog" ADD CONSTRAINT "AdminAuditLog_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "Agreement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_authorCompanyId_fkey" FOREIGN KEY ("authorCompanyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_targetCompanyId_fkey" FOREIGN KEY ("targetCompanyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
