import { DocumentAnalysis } from "../types/document.types";
import { analyzeDocumentWithAI } from "./ai.service";

export async function analyzePdf(buffer: Buffer, fileName: string): Promise<DocumentAnalysis> {
  const result = await analyzeDocumentWithAI(buffer, fileName);
  return { fileName, ...result.analysis, provider: result.provider };
}
