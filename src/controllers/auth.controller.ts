import { NextFunction, Request, Response } from "express";
import { UserRole } from "@prisma/client";
import { z } from "zod";
import * as service from "../services/auth.service";
import { parseBody } from "../utils/validation";

const credentials = z.object({ email: z.email(), password: z.string().min(8) });
const verifyEmailBody = z.object({
  email: z.email(),
  code: z.string().regex(/^\d{6}$/, "code must contain exactly 6 digits"),
});
const resendVerificationBody = z.object({ email: z.email() });

export async function register(req: Request, res: Response, next: NextFunction) { try {
  const body = parseBody(credentials.extend({ role: z.enum(UserRole) }), req.body);
  res.status(201).json(await service.registerUser(body.email.toLowerCase(), body.password, body.role));
} catch (e) { next(e); } }
export async function login(req: Request, res: Response, next: NextFunction) { try {
  const body = parseBody(credentials, req.body); res.json(await service.loginUser(body.email.toLowerCase(), body.password));
} catch (e) { next(e); } }
export async function me(req: Request, res: Response, next: NextFunction) { try { res.json(await service.getMe(req.auth!.userId)); } catch (e) { next(e); } }
export async function verifyEmail(req: Request, res: Response, next: NextFunction) { try {
  const body = parseBody(verifyEmailBody, req.body);
  res.json(await service.verifyEmail(body.email.toLowerCase(), body.code));
} catch (e) { next(e); } }
export async function resendVerification(req: Request, res: Response, next: NextFunction) { try {
  const body = parseBody(resendVerificationBody, req.body);
  res.json(await service.resendVerification(body.email.toLowerCase()));
} catch (e) { next(e); } }

