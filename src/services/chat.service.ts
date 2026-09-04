import { ChatRequest, ChatResponse } from "../types/chat.types";
import { buildAIContext } from "./ai-context.service";
import { askAI } from "./ai.service";

export async function contextualChat(input: ChatRequest): Promise<ChatResponse> {
  const { applicationContext, summary } = await buildAIContext(input);
  const response = await askAI(input.message, applicationContext);
  return Object.keys(summary).length ? { ...response, context: summary } : response;
}
