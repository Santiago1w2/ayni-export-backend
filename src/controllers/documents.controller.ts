import { NextFunction, Request, Response } from "express";
import { analyzePdf } from "../services/document.service";
import { AppError } from "../utils/errors";

export async function analyzeDocument(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    if (!request.file) throw new AppError("Debes adjuntar un PDF en el campo document");

    console.info("[Document upload]", {
      originalname: request.file.originalname,
      mimetype: request.file.mimetype,
      size: request.file.size,
    });

    const hasPdfExtension = request.file.originalname.toLowerCase().endsWith(".pdf");
    const hasPdfSignature = request.file.buffer.length >= 5
      && request.file.buffer.subarray(0, 5).toString("ascii") === "%PDF-";

    if (!hasPdfExtension || !hasPdfSignature) {
      throw new AppError("El archivo debe ser un PDF vÃ¡lido");
    }

    response.json(await analyzePdf(request.file.buffer, request.file.originalname));
  } catch (error) { next(error); }
}

