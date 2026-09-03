import { z } from "zod";
import { AppError } from "./errors";

export function parseBody<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new AppError(result.error.issues[0]?.message || "invalid input", 400);
  return result.data;
}
