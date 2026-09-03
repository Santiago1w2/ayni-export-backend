import { NextFunction, Request, Response } from "express";
import { contextualChat } from "../services/chat.service";
import { ChatRequest } from "../types/chat.types";
import { AppError } from "../utils/errors";

export async function chat(request: Request<object, object, ChatRequest>, response: Response, next: NextFunction): Promise<void> {
  try {
    if (typeof request.body.message !== "string" || !request.body.message.trim()) throw new AppError("message es obligatorio");
    response.json(await contextualChat(request.auth!.userId, { ...request.body, message: request.body.message.trim() }));
  } catch (error) { next(error); }
}

