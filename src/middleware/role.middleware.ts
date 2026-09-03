import { UserRole } from "@prisma/client";
import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/errors";

export const requireRole = (...roles: UserRole[]) => (request: Request, _response: Response, next: NextFunction): void => {
  if (!request.auth) return next(new AppError("authentication required", 401));
  if (!roles.includes(request.auth.role)) return next(new AppError("forbidden", 403));
  next();
};
