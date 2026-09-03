import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { UserRole } from "@prisma/client";
import { env } from "../config/env";
import { AppError } from "../utils/errors";

interface TokenPayload { userId: string; role: UserRole }

export function requireAuth(request: Request, _response: Response, next: NextFunction): void {
  try {
    const [scheme, token] = request.headers.authorization?.split(" ") ?? [];
    if (scheme !== "Bearer" || !token) throw new AppError("authentication required", 401);
    const payload = jwt.verify(token, env.jwtSecret) as TokenPayload;
    request.auth = { userId: payload.userId, role: payload.role };
    next();
  } catch (error) {
    next(error instanceof AppError ? error : new AppError("invalid or expired token", 401));
  }
}
