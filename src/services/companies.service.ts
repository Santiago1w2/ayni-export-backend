import { prisma } from "../config/prisma";
import { AppError } from "../utils/errors";

export interface CompanyInput { legalName: string; tradeName?: string; countryCode: string; taxId: string; website?: string; phone?: string; contactEmail: string; description?: string; logoUrl?: string }

export async function createCompany(userId: string, data: CompanyInput) {
  if (await prisma.company.findUnique({ where: { ownerUserId: userId } })) throw new AppError("user already has a company", 409);
  return prisma.company.create({ data: { ...data, countryCode: data.countryCode.toUpperCase(), ownerUserId: userId } });
}
export async function myCompany(userId: string) { const company = await prisma.company.findUnique({ where: { ownerUserId: userId } }); if (!company) throw new AppError("company not found", 404); return company; }
export async function updateCompany(userId: string, data: Partial<CompanyInput>) { await myCompany(userId); return prisma.company.update({ where: { ownerUserId: userId }, data: { ...data, countryCode: data.countryCode?.toUpperCase() } }); }
export async function publicCompany(id: string) { const company = await prisma.company.findUnique({ where: { id }, select: { id: true, legalName: true, tradeName: true, countryCode: true, taxId: true, website: true, description: true, logoUrl: true, verificationStatus: true, verifiedAt: true, createdAt: true } }); if (!company) throw new AppError("company not found", 404); return company; }
