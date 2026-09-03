import { VerificationStatus } from "@prisma/client";
import { env } from "../config/env";
import { prisma } from "../config/prisma";
import { myCompany } from "./companies.service";

export async function verifyMyCompany(userId: string) {
  const company = await myCompany(userId);
  let status: VerificationStatus = VerificationStatus.MANUAL_REVIEW;
  let source = "MANUAL_REVIEW_MVP";
  let result: object = { note: "Basic identity data queued for manual review" };
  if (company.countryCode === "PE" && env.rucApiUrl && env.rucApiKey) {
    try {
      const response = await fetch(env.rucApiUrl, { method: "POST", headers: { Authorization: `Bearer ${env.rucApiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ ruc: company.taxId }), signal: AbortSignal.timeout(10_000) });
      if (response.ok) { result = await response.json() as object; status = VerificationStatus.MANUAL_REVIEW; source = "CONFIGURED_RUC_API"; }
    } catch { /* a provider failure remains manual review */ }
  } else if (company.verificationSource === "DEMO_SEED") {
    status = VerificationStatus.VERIFIED; source = "DEMO_SEED"; result = { demo: true, disclaimer: "Seeded identity verification for MVP only" };
  }
  return prisma.$transaction(async (tx) => {
    await tx.companyVerification.create({ data: { companyId: company.id, type: "BASIC_IDENTITY", status, source, result } });
    return tx.company.update({ where: { id: company.id }, data: { verificationStatus: status, verifiedAt: status === "VERIFIED" ? new Date() : null, verificationSource: source, verificationNotes: "Identity check only; not a solvency or safety guarantee." } });
  });
}
