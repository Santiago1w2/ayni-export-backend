import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { env } from "./env";

const globalPrisma = globalThis as unknown as { prisma?: PrismaClient };
const adapter = new PrismaPg({ connectionString: env.databaseUrl });

export const prisma = globalPrisma.prisma ?? new PrismaClient({ adapter });
if (env.nodeEnv !== "production") globalPrisma.prisma = prisma;
