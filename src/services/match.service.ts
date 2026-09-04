import { BuyingInterest, ExportOffer } from "@prisma/client";
import { prisma } from "../config/prisma";
import { AppError } from "../utils/errors";
import { ownedOffer } from "./offers.service";

const normalize = (value: string) => value.trim().toLocaleLowerCase();
const clamp = (value: number) => Math.max(0, Math.min(100, value));

export function calculateOfferInterestMatch(offer: ExportOffer, interest: BuyingInterest) {
  let score = 0;
  const reasons: string[] = [];

  if (normalize(interest.productName) === normalize(offer.productName)) {
    score += 25;
    reasons.push("Producto compatible");
  }

  const maximumQuantity = interest.maxQuantityTons ?? Infinity;
  if (offer.quantityTons >= interest.minQuantityTons && offer.quantityTons <= maximumQuantity) {
    score += 25;
    reasons.push("Cantidad compatible");
  } else {
    const distance = offer.quantityTons < interest.minQuantityTons
      ? offer.quantityTons / interest.minQuantityTons
      : maximumQuantity / offer.quantityTons;
    score += 25 * Math.max(0, Math.min(1, distance));
    reasons.push("Cantidad requiere negociacion");
  }

  const targetCenter = interest.minTargetPrice !== null && interest.maxTargetPrice !== null
    ? (interest.minTargetPrice + interest.maxTargetPrice) / 2
    : interest.maxTargetPrice ?? interest.minTargetPrice ?? offer.pricePerKg;
  const priceCompatibility = targetCenter === 0
    ? (offer.pricePerKg === 0 ? 1 : 0)
    : Math.max(0, 1 - Math.abs(offer.pricePerKg - targetCenter) / targetCenter);
  score += 25 * priceCompatibility;
  reasons.push(priceCompatibility >= 0.9 ? "Precio altamente compatible" : "Precio requiere revision");

  const certifications = new Set(offer.certifications.map(normalize));
  const certificationRatio = interest.requiredCertifications.length
    ? interest.requiredCertifications.filter((item) => certifications.has(normalize(item))).length
      / interest.requiredCertifications.length
    : 1;
  score += 15 * certificationRatio;
  reasons.push(certificationRatio === 1 ? "Certificaciones compatibles" : "Faltan certificaciones solicitadas");

  const preferredOrigins = interest.preferredOriginCountries.map(normalize);
  if (preferredOrigins.length === 0 || preferredOrigins.includes("pe") || preferredOrigins.includes("peru")) {
    score += 10;
    reasons.push("Origen compatible");
  }

  return {
    score: Math.round(clamp(score)),
    estimatedRevenue: Number((offer.quantityTons * 1000 * offer.pricePerKg).toFixed(2)),
    reasons,
  };
}

export async function findOfferMatches(userId: string, offerId: string) {
  const offer = await ownedOffer(userId, offerId);
  const interests = await prisma.buyingInterest.findMany({
    where: { active: true, importerCompany: { owner: { role: "IMPORTER" } } },
    include: {
      importerCompany: {
        select: { id: true, legalName: true, tradeName: true, countryCode: true, verificationStatus: true },
      },
    },
  });

  return interests.map((interest) => {
    const deterministicMatch = calculateOfferInterestMatch(offer, interest);
    return {
      importer: interest.importerCompany,
      buyingInterest: {
        id: interest.id,
        productName: interest.productName,
        minQuantityTons: interest.minQuantityTons,
        maxQuantityTons: interest.maxQuantityTons,
        minTargetPrice: interest.minTargetPrice,
        maxTargetPrice: interest.maxTargetPrice,
        currency: interest.currency,
        requiredCertifications: interest.requiredCertifications,
      },
      ...deterministicMatch,
    };
  }).sort((left, right) => right.score - left.score);
}

export async function getOfferMatches(userId: string, offerId: string) {
  const matches = await findOfferMatches(userId, offerId);
  if (!matches.length) throw new AppError("no active importer interests found", 404);
  return {
    matches,
    feedback: {
      summary: `Se evaluaron ${matches.length} oportunidades activas.`,
      bestMatch: matches[0],
      alternatives: matches.slice(1, 4),
      marketInsights: ["Ranking calculado de forma determinista con datos de PostgreSQL."],
      recommendations: ["Confirmar condiciones directamente con el importador."],
      provider: "mock",
    },
  };
}
