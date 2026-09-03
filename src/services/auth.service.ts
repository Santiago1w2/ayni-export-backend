import bcrypt from "bcrypt";
import jwt, { SignOptions } from "jsonwebtoken";
import { UserRole } from "@prisma/client";
import { prisma } from "../config/prisma";
import { env } from "../config/env";
import { AppError } from "../utils/errors";

const publicUser = { id: true, email: true, role: true, isActive: true, createdAt: true, updatedAt: true } as const;

export async function registerUser(email: string, password: string, role: UserRole) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new AppError("email already registered", 409);
  return prisma.user.create({ data: { email, passwordHash: await bcrypt.hash(password, 12), role }, select: publicUser });
}

export async function loginUser(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive || !(await bcrypt.compare(password, user.passwordHash))) throw new AppError("invalid credentials", 401);
  const token = jwt.sign({ userId: user.id, role: user.role }, env.jwtSecret, { expiresIn: env.jwtExpiresIn as SignOptions["expiresIn"] });
  const { passwordHash: _passwordHash, ...safeUser } = user;
  return { token, user: safeUser };
}

export const getMe = (userId: string) => prisma.user.findUnique({ where: { id: userId }, select: { ...publicUser, company: true } });
