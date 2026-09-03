import multer from "multer";
import { AppError } from "../utils/errors";

export const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024, files: 1 } });

export function assertPdf(file?: Express.Multer.File): asserts file is Express.Multer.File {
  if (!file) throw new AppError("Debes adjuntar un PDF", 400);
  const extension = file.originalname.toLowerCase().endsWith(".pdf");
  const signature = file.buffer.length >= 5 && file.buffer.subarray(0, 5).toString("ascii") === "%PDF-";
  if (!extension || !signature) throw new AppError("El archivo debe ser un PDF válido", 400);
}
