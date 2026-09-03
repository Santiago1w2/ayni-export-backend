export type AIProvider = "gemini" | "mock";

export interface ChatRequest {
  message: string;
  offerId?: string;
  requestId?: string;
  importerId?: string;
}

export interface ChatResponse {
  message: string;
  provider: AIProvider;
}
