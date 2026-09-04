import { BuyingInterest, ExportOffer } from "@prisma/client";
import { prisma } from "../config/prisma";
import { AppError } from "../utils/errors";
import { ownedOffer } from "./offers.service";

const clamp = (value: number) => Math.max(0, Math.min(100, value));

export function normalizeMatchText(value: string): string {
  return value.trim().toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[-_]+/g, " ").replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
}

const productAliases: Record<string, string> = {
  aguacate: "palta",
  "aguacate hass": "palta hass",
  arandanos: "arandano",
  cafes: "cafe",
  mangos: "mango",
  paltas: "palta",
};

function canonicalProduct(value: string): string {
  const normalized = normalizeMatchText(value);
  return productAliases[normalized] ?? normalized;
}

function normalizeCertification(value: string): string {
  return normalizeMatchText(value).replace(/\b(g a p)\b/g, "gap").replace(/\s/g, "");
}

function normalizeCountry(value: string): string {
  const normalized = normalizeMatchText(value);
  if (["pe", "peru"].includes(normalized)) return "pe";
  return normalized;
}

export function calculateOfferInterestMatch(offer: ExportOffer, interest: BuyingInterest) {
  let score = 0;
  const reasons: string[] = [];
  const missingRequirements: string[] = [];
  const offerProduct = canonicalProduct(offer.productName);
  const interestProduct = canonicalProduct(interest.productName);
  const exactProduct = offerProduct === interestProduct;
  const closeProduct = !exactProduct && (offerProduct.includes(interestProduct) || interestProduct.includes(offerProduct));
  const productScore = exactProduct ? 25 : closeProduct ? 15 : 0;
  score += productScore;
  reasons.push(exactProduct ? "Producto compatible" : closeProduct ? "Producto relacionado" : "Producto diferente");

  const maximumQuantity = interest.maxQuantityTons ?? Infinity;
  const quantityInside = offer.quantityTons >= interest.minQuantityTons && offer.quantityTons <= maximumQuantity;
  const quantityRatio = quantityInside ? 1 : offer.quantityTons < interest.minQuantityTons ? offer.quantityTons / interest.minQuantityTons : maximumQuantity / offer.quantityTons;
  const quantityScore = 25 * clamp(quantityRatio * 100) / 100;
  score += quantityScore;
  reasons.push(quantityInside ? "Cantidad compatible" : "Cantidad requiere negociación");

  const sameCurrency = normalizeMatchText(offer.currency) === normalizeMatchText(interest.currency);
  let priceCompatibility = 0;
  if (sameCurrency) {
    const minimum = interest.minTargetPrice;
    const maximum = interest.maxTargetPrice;
    const inside = (minimum === null || offer.pricePerKg >= minimum) && (maximum === null || offer.pricePerKg <= maximum);
    if (inside) priceCompatibility = 1;
    else {
      const nearest = offer.pricePerKg < (minimum ?? 0) ? minimum : maximum;
      priceCompatibility = nearest && nearest > 0 ? Math.max(0, 1 - Math.abs(offer.pricePerKg - nearest) / nearest) : 0.5;
    }
    reasons.push(inside ? "Precio compatible" : "Precio requiere revisión");
  } else {
    reasons.push("Moneda diferente; precio no comparable");
    missingRequirements.push(`Cotización comparable en ${interest.currency}`);
  }
  const priceScore = 25 * priceCompatibility;
  score += priceScore;

  const certifications = new Set(offer.certifications.map(normalizeCertification));
  const missingCertifications = interest.requiredCertifications.filter(item => !certifications.has(normalizeCertification(item)));
  const certificationRatio = interest.requiredCertifications.length ? 1 - missingCertifications.length / interest.requiredCertifications.length : 1;
  const certificationScore = 15 * certificationRatio;
  score += certificationScore;
  reasons.push(missingCertifications.length ? "Faltan certificaciones solicitadas" : "Certificaciones compatibles");
  missingRequirements.push(...missingCertifications.map(item => `Certificación: ${item}`));

  const preferredOrigins = interest.preferredOriginCountries.map(normalizeCountry);
  const originCompatible = preferredOrigins.length === 0 || preferredOrigins.includes("pe");
  const originScore = originCompatible ? 10 : 0;
  score += originScore;
  reasons.push(originCompatible ? "Origen compatible" : "Origen preferido diferente");

  const categoryComparable = Boolean(offer.category && interest.category);
  const categoryCompatible = categoryComparable && normalizeMatchText(offer.category!) === normalizeMatchText(interest.category!);
  if (categoryComparable) reasons.push(categoryCompatible ? "Categoría compatible" : "Categoría diferente");

  return {
    score: Math.round(clamp(score)),
    estimatedRevenue: Number((offer.quantityTons * 1000 * offer.pricePerKg).toFixed(2)),
    breakdown: {
      product: Math.round(productScore), quantity: Math.round(quantityScore), price: Math.round(priceScore), certifications: Math.round(certificationScore), origin: originScore,
    },
    reasons,
    missingRequirements,
  };
}

export async function findOfferMatches(userId: string, offerId: string) {
  const offer = await ownedOffer(userId, offerId);
  const interests = await prisma.buyingInterest.findMany({
    where: { active: true, importerCompany: { owner: { role: "IMPORTER", accountStatus: "ACTIVE" } } },
    include: { importerCompany: { select: { id: true, legalName: true, tradeName: true, countryCode: true, verificationStatus: true } } },
  });
  if (process.env.NODE_ENV === "development") console.info("[Match] offer", { id: offer.id, productName: offer.productName, category: offer.category });
  if (process.env.NODE_ENV === "development") console.info(`[Match] active interests: ${interests.length}`);
  return interests.map(interest => {
    const deterministicMatch = calculateOfferInterestMatch(offer, interest);
    if (process.env.NODE_ENV === "development") console.info("[Match] scored candidate", { companyId: interest.importerCompanyId, productName: interest.productName, score: deterministicMatch.score });
    return {
      importer: interest.importerCompany,
      buyingInterest: { id: interest.id, productName: interest.productName, category: interest.category, minQuantityTons: interest.minQuantityTons, maxQuantityTons: interest.maxQuantityTons, minTargetPrice: interest.minTargetPrice, maxTargetPrice: interest.maxTargetPrice, currency: interest.currency, requiredCertifications: interest.requiredCertifications, preferredOriginCountries: interest.preferredOriginCountries },
      ...deterministicMatch,
    };
  }).sort((left, right) => right.score - left.score);
}

export async function getOfferMatches(userId: string, offerId: string) {
  const matches = await findOfferMatches(userId, offerId);
  if (!matches.length) throw new AppError("no active importer interests found", 404);
  return {
    offerId,
    matches,
    strongMatches: matches.filter(match => match.score >= 60).length,
    possibleMatches: matches.filter(match => match.score < 60).length,
    feedback: { summary: `Se evaluaron ${matches.length} oportunidades activas.`, bestMatch: matches[0], alternatives: matches.slice(1, 4), marketInsights: ["Ranking calculado de forma determinista con datos de PostgreSQL."], recommendations: ["Confirma las condiciones directamente con el importador."], provider: "mock" },
  };
}
