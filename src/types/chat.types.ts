export type AIProvider = "gemini" | "mock";

export interface ChatRequest {
  message: string;
  exportOfferId?: string;
  importerCompanyId?: string;
  requestId?: string;
  agreementId?: string;
}

export interface ChatResponse {
  message: string;
  provider: AIProvider;
  context?: ChatContextSummary;
}

export interface ChatContextSummary {
  offerId?: string;
  requestId?: string;
  importerCompanyId?: string;
  agreementId?: string;
  productName?: string;
}
