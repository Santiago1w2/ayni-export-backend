import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { AccountStatus, UserRole } from "@prisma/client";
import { env } from "../config/env";
import { AppError } from "../utils/errors";
import { prisma } from "../config/prisma";

interface TokenPayload { userId: string; role: UserRole }

export async function requireAuth(request: Request, _response: Response, next: NextFunction): Promise<void> {
  try {
    const [scheme, token] = request.headers.authorization?.split(" ") ?? [];
    if (scheme !== "Bearer" || !token) throw new AppError("authentication required", 401);
    const payload = jwt.verify(token, env.jwtSecret) as TokenPayload;
    const user=await prisma.user.findUnique({where:{id:payload.userId},select:{role:true,accountStatus:true,isActive:true}});
    if(!user||!user.isActive)throw new AppError("authentication required",401);
    if(user.accountStatus===AccountStatus.BLOCKED)throw new AppError("Account blocked",403);
    if(user.accountStatus===AccountStatus.SUSPENDED)throw new AppError("Account suspended",403);
    request.auth = { userId: payload.userId, role:user.role };
    next();
  } catch (error) {
    if (!(error instanceof AppError)) console.error("Authentication middleware error:", error);
    next(error instanceof AppError ? error : new AppError("invalid or expired token", 401));
  }
}
