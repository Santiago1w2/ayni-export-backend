import { NextFunction, Request, Response } from "express";
import multer from "multer";
import { Prisma } from "@prisma/client";

export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 400,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function errorHandler(
  error: unknown,
  _request: Request,
  response: Response,
  _next: NextFunction,
): void {
  if (error instanceof multer.MulterError) {
    response.status(400).json({
      error: error.code === "LIMIT_FILE_SIZE" ? "El PDF supera el límite de 10 MB" : error.message,
    });
    return;
  }

  if (error instanceof AppError) {
    response.status(error.statusCode).json({ error: error.message, ...error.details });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") { response.status(409).json({ error: "resource already exists" }); return; }
    if (error.code === "P2025") { response.status(404).json({ error: "resource not found" }); return; }
  }

  console.error("Unexpected error:", error);
  response.status(500).json({ error: "Internal server error" });
}
