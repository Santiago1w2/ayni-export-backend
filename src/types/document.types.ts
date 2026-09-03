import { AIProvider } from "./chat.types";

export type IssueSeverity = "info" | "warning" | "error";
export type DocumentStatus = "approved" | "warning" | "manual_review";

export interface DocumentIssue {
  severity: IssueSeverity;
  field: string;
  message: string;
}

export interface DocumentAnalysis {
  fileName: string;
  documentType: string;
  status: DocumentStatus;
  confidence: number;
  summary: string;
  issues: DocumentIssue[];
  recommendations: string[];
  provider: AIProvider;
}

export type AIAnalysisPayload = Omit<DocumentAnalysis, "fileName" | "provider">;
