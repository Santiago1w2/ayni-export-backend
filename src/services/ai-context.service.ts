import { Prisma, UserRole } from "@prisma/client";
import { prisma } from "../config/prisma";
import { ChatContextSummary, ChatRequest } from "../types/chat.types";
import { AppError } from "../utils/errors";
import { calculateOfferInterestMatch } from "./match.service";

const companySelect = {
  id: true,
  legalName: true,
  countryCode: true,
  verificationStatus: true,
} as const;

const offerSelect = {
  id: true,
  exporterCompanyId: true,
  productName: true,
  category: true,
  description: true,
  quantityTons: true,
  pricePerKg: true,
  currency: true,
  certifications: true,
  preferredRegion: true,
  preferredCountries: true,
  availabilityDate: true,
  status: true,
  exporterCompany: { select: companySelect },
} as const;

const buyingInterestSelect = {
  id: true,
  importerCompanyId: true,
  productName: true,
  category: true,
  description: true,
  minQuantityTons: true,
  maxQuantityTons: true,
  minTargetPrice: true,
  maxTargetPrice: true,
  currency: true,
  preferredOriginCountries: true,
  requiredCertifications: true,
  active: true,
} as const;

const agreementSelect = {
  id: true,
  requestId: true,
  agreementCode: true,
  finalQuantityTons: true,
  pricePerKg: true,
  currency: true,
  incoterm: true,
  destination: true,
  estimatedDelivery: true,
  estimatedTradeValue: true,
  status: true,
  completedAt: true,
} as const;

const operationSelect = {
  id: true,
  offerId: true,
  importerCompanyId: true,
  buyingInterestId: true,
  requirementFormId: true,
  status: true,
  matchScoreSnapshot: true,
  matchFeedbackSnapshot: true,
  submittedAt: true,
  acceptedAt: true,
  rejectedAt: true,
  completedAt: true,
  offer: { select: offerSelect },
  importerCompany: { select: companySelect },
  buyingInterest: { select: buyingInterestSelect },
  requirementForm: {
    select: {
      id: true,
      title: true,
      description: true,
      active: true,
      fields: {
        orderBy: { order: "asc" as const },
        select: { id: true, label: true, type: true, required: true, helpText: true, options: true, order: true },
      },
      documentRequirements: {
        orderBy: { order: "asc" as const },
        select: { id: true, name: true, description: true, required: true, instructionsForAI: true, order: true },
      },
    },
  },
  responses: {
    select: {
      fieldId: true,
      value: true,
      field: { select: { label: true, type: true, required: true } },
    },
  },
  documents: {
    select: {
      id: true,
      fileName: true,
      documentRequirementId: true,
      documentRequirement: { select: { name: true } },
      analysis: {
        select: {
          provider: true,
          documentType: true,
          status: true,
          confidence: true,
          summary: true,
          issues: true,
          recommendations: true,
        },
      },
    },
  },
  agreement: { select: agreementSelect },
} as const;

type OperationData = Prisma.ExportRequestGetPayload<{ select: typeof operationSelect }>;

export interface AIApplicationContext {
  exporter?: Record<string, unknown>;
  offer?: Record<string, unknown>;
  importer?: Record<string, unknown>;
  buyingInterest?: Record<string, unknown>;
  match?: { score: number; feedback?: Prisma.JsonValue | { reasons: string[] } };
  requirementForm?: Record<string, unknown>;
  request?: Record<string, unknown>;
  documents?: Record<string, unknown>[];
  agreement?: Record<string, unknown>;
}

function mapOperation(operation: OperationData): AIApplicationContext {
  const { exporterCompany, ...offer } = operation.offer;
  const context: AIApplicationContext = {
    exporter: exporterCompany,
    offer,
    importer: operation.importerCompany,
    request: {
      id: operation.id,
      offerId: operation.offerId,
      importerCompanyId: operation.importerCompanyId,
      buyingInterestId: operation.buyingInterestId,
      requirementFormId: operation.requirementFormId,
      status: operation.status,
      submittedAt: operation.submittedAt,
      acceptedAt: operation.acceptedAt,
      rejectedAt: operation.rejectedAt,
      completedAt: operation.completedAt,
      responses: operation.responses,
    },
  };

  if (operation.buyingInterest) context.buyingInterest = operation.buyingInterest;
  if (operation.matchScoreSnapshot !== null) {
    context.match = {
      score: operation.matchScoreSnapshot,
      ...(operation.matchFeedbackSnapshot !== null ? { feedback: operation.matchFeedbackSnapshot } : {}),
    };
  }
  if (operation.requirementForm) context.requirementForm = operation.requirementForm;
  if (operation.documents.length) context.documents = operation.documents;
  if (operation.agreement) context.agreement = operation.agreement;
  return context;
}

function summarize(context: AIApplicationContext): ChatContextSummary {
  const offer = context.offer as { id?: string; productName?: string } | undefined;
  const importer = context.importer as { id?: string } | undefined;
  const request = context.request as { id?: string } | undefined;
  const agreement = context.agreement as { id?: string } | undefined;
  return {
    ...(offer?.id ? { offerId: offer.id } : {}),
    ...(request?.id ? { requestId: request.id } : {}),
    ...(importer?.id ? { importerCompanyId: importer.id } : {}),
    ...(agreement?.id ? { agreementId: agreement.id } : {}),
    ...(offer?.productName ? { productName: offer.productName } : {}),
  };
}

async function contextFromRequest(requestId: string): Promise<AIApplicationContext> {
  const operation = await prisma.exportRequest.findUnique({ where: { id: requestId }, select: operationSelect });
  if (!operation) throw new AppError("request not found", 404);
  return mapOperation(operation);
}

async function contextFromAgreement(agreementId: string): Promise<AIApplicationContext> {
  const agreement = await prisma.agreement.findUnique({
    where: { id: agreementId },
    select: { ...agreementSelect, request: { select: operationSelect } },
  });
  if (!agreement) throw new AppError("agreement not found", 404);
  const { request, ...agreementData } = agreement;
  return { ...mapOperation(request), agreement: agreementData };
}

async function contextFromOffer(
  exportOfferId?: string,
  importerCompanyId?: string,
): Promise<AIApplicationContext> {
  const offer = exportOfferId
    ? await prisma.exportOffer.findUnique({ where: { id: exportOfferId }, include: { exporterCompany: { select: companySelect } } })
    : null;
  if (exportOfferId && !offer) throw new AppError("offer not found", 404);

  const importer = importerCompanyId
    ? await prisma.company.findFirst({
        where: { id: importerCompanyId, owner: { role: UserRole.IMPORTER } },
        select: companySelect,
      })
    : null;
  if (importerCompanyId && !importer) throw new AppError("importer not found", 404);

  const interest = importerCompanyId
    ? await prisma.buyingInterest.findFirst({
        where: {
          importerCompanyId,
          active: true,
          ...(offer ? { productName: { equals: offer.productName, mode: "insensitive" } } : {}),
        },
        orderBy: { updatedAt: "desc" },
      })
    : null;

  const context: AIApplicationContext = {};
  if (offer) {
    const { exporterCompany, ...offerData } = offer;
    context.exporter = exporterCompany;
    context.offer = offerData;
  }
  if (importer) context.importer = importer;
  if (interest) {
    context.buyingInterest = interest;
    if (offer) {
      const deterministicMatch = calculateOfferInterestMatch(offer, interest);
      context.match = { score: deterministicMatch.score, feedback: { reasons: deterministicMatch.reasons } };
    }
  }
  return context;
}

export async function buildAIContext(input: Omit<ChatRequest, "message"> | ChatRequest) {
  const applicationContext = input.agreementId
    ? await contextFromAgreement(input.agreementId)
    : input.requestId
      ? await contextFromRequest(input.requestId)
      : await contextFromOffer(input.exportOfferId, input.importerCompanyId);
  return { applicationContext, summary: summarize(applicationContext) };
}
