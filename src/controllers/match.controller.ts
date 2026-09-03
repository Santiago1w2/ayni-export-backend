import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/errors";

export function matchProduct(_request: Request, _response: Response, next: NextFunction): void {
  try {
    throw new AppError("Use POST /api/offers/:id/matches with a persisted offer", 410);
  } catch (error) { next(error); }
}

