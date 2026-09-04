import "dotenv/config";
import bcrypt from "bcrypt";
import { PrismaClient, UserRole, VerificationStatus } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required to seed");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
let passwordHash = "";

async function userCompany(email: string, role: UserRole, legalName: string, countryCode: string, taxId: string) {
  const user = await prisma.user.upsert({ where: { email }, update: { emailVerified: true }, create: { email, passwordHash, role, emailVerified: true } });
  return prisma.company.upsert({
    where: { ownerUserId: user.id },
    update: {},
    create: { ownerUserId: user.id, legalName, countryCode, taxId, contactEmail: email, description: "DEMO / SEEDED FOR MVP. Fictitious company for product demonstration only.", verificationStatus: VerificationStatus.VERIFIED, verifiedAt: new Date(), verificationSource: "DEMO_SEED", verificationNotes: "Seeded basic identity marker; not a solvency or safety guarantee." },
  });
}

async function main() {
passwordHash = await bcrypt.hash("Demo12345!", 12);
if(process.env.SUPER_ADMIN_EMAIL&&process.env.SUPER_ADMIN_PASSWORD){const adminHash=await bcrypt.hash(process.env.SUPER_ADMIN_PASSWORD,12);await prisma.user.upsert({where:{email:process.env.SUPER_ADMIN_EMAIL.toLowerCase()},update:{role:UserRole.ADMIN,emailVerified:true},create:{email:process.env.SUPER_ADMIN_EMAIL.toLowerCase(),passwordHash:adminHash,role:UserRole.ADMIN,emailVerified:true}})}
await userCompany("exporter.demo@ayni.local", UserRole.EXPORTER, "Agro Andino Demo SAC", "PE", "DEMO-RUC-0001");
const demos = [
  ["germany", "Ayni Demo Foods Germany", "DE", "Palta Hass"],
  ["spain", "Europa Fresh Demo Spain", "ES", "Mango"],
  ["netherlands", "Lowlands Produce Demo", "NL", "Arándano"],
  ["france", "Marché Vert Demo France", "FR", "Cacao"],
  ["usa", "Atlantic Produce Demo USA", "US", "Café"],
  ["canada", "Northern Harvest Demo Canada", "CA", "Palta Hass"],
] as const;

for (const [slug, name, country, product] of demos) {
  const company = await userCompany(`importer.${slug}@ayni.local`, UserRole.IMPORTER, name, country, `DEMO-TAX-${country}`);
  let interest = await prisma.buyingInterest.findFirst({ where: { importerCompanyId: company.id, productName: product } });
  interest ??= await prisma.buyingInterest.create({ data: { importerCompanyId: company.id, productName: product, minQuantityTons: 10, maxQuantityTons: 80, minTargetPrice: 1.5, maxTargetPrice: 4, currency: "USD", preferredOriginCountries: ["PE"], requiredCertifications: product === "Palta Hass" ? ["Global GAP"] : [], description: "DEMO buying interest seeded for MVP." } });
  if (product === "Palta Hass" && !(await prisma.requirementForm.findFirst({ where: { buyingInterestId: interest.id } }))) {
    await prisma.requirementForm.create({ data: { importerCompanyId: company.id, buyingInterestId: interest.id, title: "Palta Hass Export Requirements (DEMO)", description: "Seeded form for MVP testing.", fields: { create: [{ label: "Harvest date", type: "DATE", required: true, order: 1 }, { label: "Origin region", type: "TEXT", required: true, order: 2 }] }, documentRequirements: { create: [{ name: "Commercial Invoice", description: "Commercial invoice for the operation.", instructionsForAI: "Identify exporter, importer, product, quantity, price, currency and destination.", order: 1 }, { name: "Packing List", description: "Packing list for the shipment.", instructionsForAI: "Check packages, gross weight and net weight for visible inconsistencies.", order: 2 }, { name: "Phytosanitary Certificate", description: "Phytosanitary certificate supplied by the exporter.", instructionsForAI: "Review visible parties, product and dates without claiming regulatory approval.", order: 3 }] } } });
  }
}

console.log("Ayni MVP demo seed completed. All companies are fictitious.");
}

main().catch((error)=>{console.error(error);process.exitCode=1}).finally(()=>prisma.$disconnect());
