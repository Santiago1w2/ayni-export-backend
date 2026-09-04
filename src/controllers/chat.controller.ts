import { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { contextualChat } from "../services/chat.service";
import { ChatRequest } from "../types/chat.types";
import { parseBody } from "../utils/validation";

const chatBody = z.object({
  message: z.string().trim().min(1, "message es obligatorio"),
  exportOfferId: z.uuid().optional(),
  importerCompanyId: z.uuid().optional(),
  requestId: z.uuid().optional(),
  agreementId: z.uuid().optional(),
});

export async function chat(
  request: Request<object, object, ChatRequest>,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = parseBody(chatBody, request.body);
    response.json(await contextualChat(body));
  } catch (error) {
    next(error);
  }
}
