import dotenv from "dotenv";

dotenv.config();

console.log("GMAIL_USER:", process.env.GMAIL_USER);
console.log(
  "GMAIL_APP_PASSWORD loaded:",
  Boolean(process.env.GMAIL_APP_PASSWORD)
);

const parsedPort = Number(process.env.PORT ?? 3000);
const jwtExpirationValue = process.env.JWT_EXPIRES_IN?.trim() || "12h";

export const env = {
  port: Number.isInteger(parsedPort) && parsedPort > 0 ? parsedPort : 3000,
  frontendUrl: process.env.FRONTEND_URL?.trim() || "http://localhost:5173",
  geminiApiKey: process.env.GEMINI_API_KEY?.trim() || "",
  geminiModel: process.env.GEMINI_MODEL?.trim() || "gemini-3.7-flash",
  databaseUrl: process.env.DATABASE_URL?.trim() || "",
  directUrl: process.env.DIRECT_URL?.trim() || "",
  jwtSecret: process.env.JWT_SECRET?.trim() || "development-only-change-me",
  jwtExpiresIn: /^\d+$/.test(jwtExpirationValue) ? `${jwtExpirationValue}h` : jwtExpirationValue,
  supabaseUrl: process.env.SUPABASE_URL?.trim() || "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "",
  supabaseStorageBucket: process.env.SUPABASE_STORAGE_BUCKET?.trim() || "ayni-documents",
  rucApiUrl: process.env.RUC_API_URL?.trim() || "",
  rucApiKey: process.env.RUC_API_KEY?.trim() || "",
  nodeEnv: process.env.NODE_ENV?.trim() || "development",
  gmailUser: process.env.GMAIL_USER?.trim() || "",
  gmailAppPassword: process.env.GMAIL_APP_PASSWORD?.trim() || "",
  emailFromName: process.env.EMAIL_FROM_NAME?.trim() || "Ayni Exports",
  superAdminEmail: process.env.SUPER_ADMIN_EMAIL?.trim() || "",
  superAdminPassword: process.env.SUPER_ADMIN_PASSWORD || "",
};
