import { UserRole, VerificationStatus } from "@prisma/client";
import { prisma } from "../config/prisma";
import { AppError } from "../utils/errors";
export async function listImporters(query: Record<string, unknown>) {
  const page=Math.max(1,Number(query.page)||1),limit=Math.min(100,Math.max(1,Number(query.limit)||20)); const search=String(query.search||"");
  const where={ owner:{role:UserRole.IMPORTER}, ...(query.country?{countryCode:String(query.country).toUpperCase()}:{}), ...(query.verified==="true"?{verificationStatus:VerificationStatus.VERIFIED}:{}), ...(search?{OR:[{legalName:{contains:search,mode:"insensitive" as const}},{tradeName:{contains:search,mode:"insensitive" as const}},{buyingInterests:{some:{productName:{contains:search,mode:"insensitive" as const},active:true}}}]}:{}), ...(query.product?{buyingInterests:{some:{productName:{contains:String(query.product),mode:"insensitive" as const},active:true}}}:{}) };
  const [items,total]=await prisma.$transaction([prisma.company.findMany({where,skip:(page-1)*limit,take:limit,select:{id:true,legalName:true,tradeName:true,countryCode:true,website:true,description:true,logoUrl:true,verificationStatus:true,buyingInterests:{where:{active:true}}}}),prisma.company.count({where})]); return {items,page,limit,total};
}
export async function importerDetail(id:string){const item=await prisma.company.findFirst({where:{id,owner:{role:UserRole.IMPORTER}},select:{id:true,legalName:true,tradeName:true,countryCode:true,website:true,description:true,logoUrl:true,verificationStatus:true,buyingInterests:{where:{active:true}},requirementForms:{where:{active:true},include:{fields:true,documentRequirements:true}}}});if(!item)throw new AppError("importer not found",404);return item;}
