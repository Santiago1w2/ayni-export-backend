import { GoogleGenAI } from "@google/genai";
import { env } from "../config/env";
import { AIProvider, ChatResponse } from "../types/chat.types";
import { AIAnalysisPayload, DocumentIssue, DocumentStatus } from "../types/document.types";

const ai = env.geminiApiKey ? new GoogleGenAI({ apiKey: env.geminiApiKey }) : null;
const REQUEST_TIMEOUT_MS = 20_000;

const CHAT_SYSTEM_PROMPT = `Eres Ayni AI, un copiloto inteligente para pequeñas empresas peruanas que desean exportar sus productos.

Tu objetivo es orientar al usuario durante el proceso de exportación y ayudarlo a interpretar información disponible dentro de Ayni Exports.

Puedes ayudar con comparación de oportunidades, interpretación del porcentaje de matching, compradores mostrados por la plataforma, requisitos documentales generales, interpretación de observaciones encontradas en documentos y explicación de valores comerciales.

Reglas importantes:
- Responde de manera clara, breve y profesional.
- No inventes importadores, precios, leyes ni requisitos regulatorios.
- No asegures que un documento está legalmente aprobado.
- Cuando no tengas información suficiente, indícalo.
- Ayni ofrece orientación preliminar y no sustituye asesoría legal o aduanera profesional.`;

const DOCUMENT_ANALYSIS_PROMPT = `Eres el módulo de revisión documental de Ayni Exports. Realiza únicamente una revisión preliminar del PDF adjunto relacionado con comercio exterior.

Cuando sean aplicables, revisa: tipo de documento, exportador, importador, producto y descripción, cantidad, peso, precio, moneda, países de origen y destino, fechas, números de referencia, campos aparentemente vacíos, inconsistencias internas visibles, información ambigua y datos importantes poco claros.

No inventes requisitos legales. No afirmes que el documento es legalmente válido ni que está aprobado por aduanas. Cuando no tengas certeza suficiente, indica que requiere revisión manual. Devuelve únicamente el JSON solicitado.`;

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
  const reason = error instanceof Error ? error.message : "error desconocido";
  console.warn(`[Ayni AI] Gemini no disponible; usando fallback mock: ${reason}`);
}

function requireGemini(): GoogleGenAI {
  if (!ai) throw new Error("GEMINI_API_KEY no configurada");
  return ai;
}

function mockChat(message: string): string {
  const lower = message.toLocaleLowerCase();
  if (lower.includes("document")) return "Sube el PDF para una revisión preliminar de sus datos comerciales. El resultado no sustituye una revisión legal o aduanera.";
  if (lower.includes("comprador") || lower.includes("match")) return "Compara el porcentaje de compatibilidad, precio objetivo, volumen mínimo, certificaciones y región. Confirma las condiciones directamente antes de cerrar el acuerdo.";
  if (lower.includes("europa") || lower.includes("mercado")) return "Indica Europe como región preferida y compara los compradores ficticios mostrados por el matching. Revisa especialmente volumen, precio y certificaciones.";
  if (lower.includes("cuánto") || lower.includes("generar") || lower.includes("ingreso")) return "El valor estimado se calcula como toneladas × 1,000 × precio por kg. Necesito esos valores para darte una cifra concreta.";
  return "Puedo ayudarte a comparar compradores, estimar una operación e interpretar observaciones documentales. Comparte producto, cantidad, precio, certificaciones y mercado preferido.";
}

export async function askAI(message: string, context?: string): Promise<ChatResponse> {
  try {
    const interaction = await requireGemini().interactions.create({
      model: env.geminiModel,
      system_instruction: CHAT_SYSTEM_PROMPT,
      input: context ? `${message}\n\nContexto verificado de Ayni Exports:\n${context}` : message,
    }, { timeout: REQUEST_TIMEOUT_MS });
    const content = interaction.output_text?.trim();
    if (!content) throw new Error("Gemini devolvió una respuesta vacía");
    return { message: content, provider: "gemini" };
  } catch (error) {
    warnFallback(error);
    return { message: mockChat(message), provider: "mock" };
  }
}

function safeParseJson(content: string): unknown {
  const cleaned = content.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("Gemini no devolvió JSON válido");
  return JSON.parse(cleaned.slice(start, end + 1));
}

const hasText = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;

function normalizeAnalysis(value: unknown): AIAnalysisPayload {
  if (!value || typeof value !== "object") throw new Error("Estructura de análisis inválida");
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
    summary: hasText(record.summary) ? record.summary.trim() : "El documento requiere revisión manual.",
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
    summary: "El análisis automático no está disponible. Se recomienda revisión manual.",
    issues: [],
    recommendations: ["Realizar una revisión manual del documento."],
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
      response_format: {
        type: "text",
        mime_type: "application/json",
        schema: DOCUMENT_SCHEMA,
      },
    }, { timeout: REQUEST_TIMEOUT_MS });
    const content = interaction.output_text?.trim();
    if (!content) throw new Error("Gemini devolvió una respuesta documental vacía");
    return { analysis: normalizeAnalysis(safeParseJson(content)), provider: "gemini" };
  } catch (error) {
    warnFallback(error);
    return { analysis: mockDocumentAnalysis(), provider: "mock" };
  }
}
