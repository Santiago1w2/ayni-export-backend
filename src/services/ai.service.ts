import { GoogleGenAI } from "@google/genai";
import { env } from "../config/env";
import { AIProvider, ChatResponse } from "../types/chat.types";
import { AIAnalysisPayload, DocumentIssue, DocumentStatus } from "../types/document.types";
import type { AIApplicationContext } from "./ai-context.service";

const ai = env.geminiApiKey ? new GoogleGenAI({ apiKey: env.geminiApiKey }) : null;
const REQUEST_TIMEOUT_MS = 60_000;

const CHAT_SYSTEM_PROMPT = `You are Ayni AI, the contextual assistant of Ayni Exports.

The application backend has provided verified application context from PostgreSQL.

Use that context before asking the user for information.

Never ask for product, quantity, price, certifications, importer, requirements or operation status if that information is already present in APPLICATION_CONTEXT.

Do not invent database information.

If a value is absent, say that it has not been registered.

Matching scores, prices, quantities, trade values and statistics provided in APPLICATION_CONTEXT are deterministic application data. Do not recalculate or alter them.

Document analysis is preliminary guidance, not legal/customs approval.

Answer in the same language as the user. Be clear, concise and professional.`;

const DOCUMENT_ANALYSIS_PROMPT = `Eres el modulo de revision documental de Ayni Exports. Realiza unicamente una revision preliminar del PDF adjunto relacionado con comercio exterior.

Cuando sean aplicables, revisa: tipo de documento, exportador, importador, producto y descripcion, cantidad, peso, precio, moneda, paises de origen y destino, fechas, numeros de referencia, campos aparentemente vacios, inconsistencias internas visibles, informacion ambigua y datos importantes poco claros.

No inventes requisitos legales. No afirmes que el documento es legalmente valido ni que esta aprobado por aduanas. Cuando no tengas certeza suficiente, indica que requiere revision manual. Devuelve unicamente el JSON solicitado.`;

const DOCUMENT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["documentType", "status", "confidence", "summary", "issues", "recommendations"],
  properties: {
    documentType: { type: "string" },
    status: { type: "string", enum: ["approved", "warning", "manual_review"] },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    summary: { type: "string" },
    issues: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["severity", "field", "message"],
        properties: {
          severity: { type: "string", enum: ["info", "warning", "error"] },
          field: { type: "string" },
          message: { type: "string" },
        },
      },
    },
    recommendations: { type: "array", items: { type: "string" } },
  },
};

function warnFallback(error: unknown): void {
  if (env.nodeEnv !== "development") return;
  const geminiError = error as { message?: string; status?: number; code?: string | number };
  console.warn("[AI] Gemini request failed", {
    message: geminiError?.message ?? "Unknown Gemini error",
    status: geminiError?.status,
    code: geminiError?.code,
    model: env.geminiModel,
  });
}

function requireGemini(): GoogleGenAI {
  if (!ai) throw new Error("GEMINI_API_KEY no configurada");
  return ai;
}

function contextualFallback(message: string, context: AIApplicationContext): string {
  const lower = message.toLocaleLowerCase();
  const offer = context.offer as {
    productName?: string;
    quantityTons?: number;
    pricePerKg?: number;
    currency?: string;
  } | undefined;
  const interest = context.buyingInterest as {
    minTargetPrice?: number | null;
    maxTargetPrice?: number | null;
    currency?: string;
  } | undefined;
  const request = context.request as { status?: string } | undefined;
  const requirementForm = context.requirementForm as {
    fields?: { id?: string; label?: string; required?: boolean }[];
    documentRequirements?: { id?: string; name?: string; required?: boolean }[];
  } | undefined;
  const responses = (context.request as { responses?: { fieldId?: string }[] } | undefined)?.responses ?? [];
  const documents = context.documents ?? [];
  const product = offer?.productName ?? "producto no registrado";
  const price = offer?.pricePerKg !== undefined
    ? `${offer.currency ?? ""} ${offer.pricePerKg}/kg`.trim()
    : "precio no registrado";

  if (lower.includes("document")) {
    if (!documents.length) return "Esta operacion todavia no tiene documentos registrados para revisar.";
    const summaries = documents.map((document) => {
      const item = document as { fileName?: string; analysis?: { status?: string; summary?: string } | null };
      return `${item.fileName ?? "Documento"}: ${item.analysis?.status ?? "sin analisis"}${item.analysis?.summary ? ` - ${item.analysis.summary}` : ""}`;
    });
    return `Revision preliminar de documentos: ${summaries.join("; ")}. Esto no constituye aprobacion legal ni aduanera.`;
  }
  if (lower.includes("falta") || lower.includes("continuar") || lower.includes("requisit")) {
    const answeredFieldIds = new Set(responses.map((response) => response.fieldId));
    const uploadedRequirementIds = new Set(documents.map((document) => (document as { documentRequirementId?: string }).documentRequirementId));
    const missingFields = requirementForm?.fields
      ?.filter((field) => field.required && field.id && !answeredFieldIds.has(field.id))
      .map((field) => field.label ?? field.id) ?? [];
    const missingDocuments = requirementForm?.documentRequirements
      ?.filter((requirement) => requirement.required && requirement.id && !uploadedRequirementIds.has(requirement.id))
      .map((requirement) => requirement.name ?? requirement.id) ?? [];
    const pending = [
      ...(missingFields.length ? [`campos: ${missingFields.join(", ")}`] : []),
      ...(missingDocuments.length ? [`documentos: ${missingDocuments.join(", ")}`] : []),
    ];
    return pending.length
      ? `Para continuar te falta completar ${pending.join("; ")}. La operacion esta en estado ${request?.status ?? "no registrado"}.`
      : `No hay requisitos obligatorios pendientes registrados. La operacion esta en estado ${request?.status ?? "no registrado"}.`;
  }
  if ((lower.includes("qué producto") || lower.includes("que producto") || lower.includes("producto")) && offer) {
    return `Estas exportando ${product}.`;
  }
  if ((lower.includes("cuánto") || lower.includes("cuanto") || lower.includes("cantidad")) && offer?.quantityTons !== undefined) {
    return `Tu oferta de ${product} registra ${offer.quantityTons} toneladas.`;
  }
  if ((lower.includes("precio") || lower.includes("comprador") || lower.includes("match") || lower.includes("coincide")) && offer) {
    const target = interest
      ? ` El comprador busca entre ${interest.minTargetPrice ?? "un minimo no registrado"} y ${interest.maxTargetPrice ?? "un maximo no registrado"} ${interest.currency ?? ""} por kg.`
      : " No hay un interes de compra compatible registrado para comparar el precio.";
    const score = context.match ? ` El matching determinista es ${context.match.score}%.` : "";
    return `Tu oferta actual de ${product} esta registrada a ${price}.${target}${score}`;
  }
  if (offer) {
    return `Tu oferta actual es ${product}, ${offer.quantityTons ?? "cantidad no registrada"} toneladas a ${price}.${request?.status ? ` La operacion esta en estado ${request.status}.` : ""}`;
  }
  if (context.importer) return "El comprador seleccionado esta cargado, pero no hay una oferta registrada en este contexto.";
  return "Puedo ayudarte a entender el proceso de Ayni Exports. No se proporciono un contexto de operacion para esta consulta.";
}

export async function askAI(message: string, context: AIApplicationContext = {}): Promise<ChatResponse> {
  try {
    const response = await requireGemini().models.generateContent({
      model: env.geminiModel,
      contents: `APPLICATION_CONTEXT:\n${JSON.stringify(context)}\n\nUSER_MESSAGE:\n${message}`,
      config: {
        systemInstruction: CHAT_SYSTEM_PROMPT,
        httpOptions: { timeout: REQUEST_TIMEOUT_MS },
      },
    });
    const content = response.text?.trim();
    if (!content) throw new Error("Gemini devolvio una respuesta vacia");
    return { message: content, provider: "gemini" };
  } catch (error) {
    warnFallback(error);
    return { message: contextualFallback(message, context), provider: "mock" };
  }
}

function safeParseJson(content: string): unknown {
  const cleaned = content.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("Gemini no devolvio JSON valido");
  return JSON.parse(cleaned.slice(start, end + 1));
}

const hasText = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;

function normalizeAnalysis(value: unknown): AIAnalysisPayload {
  if (!value || typeof value !== "object") throw new Error("Estructura de analisis invalida");
  const record = value as Record<string, unknown>;
  const confidence = typeof record.confidence === "number" && Number.isFinite(record.confidence)
    ? Math.min(1, Math.max(0, record.confidence))
    : 0.5;
  const issues: DocumentIssue[] = Array.isArray(record.issues)
    ? record.issues.flatMap((item) => {
        if (!item || typeof item !== "object") return [];
        const issue = item as Record<string, unknown>;
        if (!hasText(issue.field) || !hasText(issue.message)) return [];
        const severity = issue.severity === "info" || issue.severity === "warning" || issue.severity === "error"
          ? issue.severity
          : "warning";
        return [{ severity, field: issue.field.trim(), message: issue.message.trim() }];
      })
    : [];
  const hasErrors = issues.some((issue) => issue.severity === "error");
  const requestedStatus = record.status === "approved" || record.status === "warning" || record.status === "manual_review"
    ? record.status
    : "manual_review";
  const status: DocumentStatus = confidence < 0.7 ? "manual_review" : hasErrors ? "warning" : requestedStatus;

  return {
    documentType: hasText(record.documentType) ? record.documentType.trim() : "Unknown document",
    status,
    confidence,
    summary: hasText(record.summary) ? record.summary.trim() : "El documento requiere revision manual.",
    issues,
    recommendations: Array.isArray(record.recommendations)
      ? record.recommendations.filter(hasText).map((item) => item.trim())
      : [],
  };
}

function mockDocumentAnalysis(): AIAnalysisPayload {
  return {
    documentType: "Unknown document",
    status: "manual_review",
    confidence: 0.55,
    summary: "El analisis automatico no esta disponible. Se recomienda revision manual.",
    issues: [],
    recommendations: ["Realizar una revision manual del documento."],
  };
}

export async function analyzeDocumentWithAI(
  pdfBuffer: Buffer,
  fileName: string,
  requirementContext?: string,
): Promise<{ analysis: AIAnalysisPayload; provider: AIProvider }> {
  try {
    const pdfBase64 = pdfBuffer.toString("base64");
    const interaction = await requireGemini().interactions.create({
      model: env.geminiModel,
      input: [
        { type: "text", text: `${DOCUMENT_ANALYSIS_PROMPT}\n\nNombre del archivo: ${fileName}${requirementContext ? `\n\nRequisito definido por el importador:\n${requirementContext}` : ""}` },
        { type: "document", data: pdfBase64, mime_type: "application/pdf" },
      ],
      response_format: { type: "text", mime_type: "application/json", schema: DOCUMENT_SCHEMA },
    }, { timeout: REQUEST_TIMEOUT_MS });
    const content = interaction.output_text?.trim();
    if (!content) throw new Error("Gemini devolvio una respuesta documental vacia");
    return { analysis: normalizeAnalysis(safeParseJson(content)), provider: "gemini" };
  } catch (error) {
    warnFallback(error);
    return { analysis: mockDocumentAnalysis(), provider: "mock" };
  }
}
