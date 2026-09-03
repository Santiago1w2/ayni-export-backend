import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env";
import agreementsRoutes from "./routes/agreements.routes";
import chatRoutes from "./routes/chat.routes";
import documentsRoutes from "./routes/documents.routes";
import matchRoutes from "./routes/match.routes";
import { errorHandler } from "./utils/errors";
import authRoutes from "./routes/auth.routes";
import companiesRoutes from "./routes/companies.routes";
import importersRoutes from "./routes/importers.routes";
import interestsRoutes from "./routes/interests.routes";
import offersRoutes from "./routes/offers.routes";
import formsRoutes from "./routes/requirement-forms.routes";
import fieldsRoutes from "./routes/requirement-fields.routes";
import documentRequirementsRoutes from "./routes/document-requirements.routes";
import requestsRoutes from "./routes/requests.routes";

const app = express();
const allowedOrigins = new Set([env.frontendUrl]);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) callback(null, true);
    else callback(null, false);
  },
}));
app.use(helmet());
app.use(express.json({ limit: "1mb" }));

app.get("/", (_request, response) => response.json({ name: "Ayni Exports API", status: "running" }));
app.get("/api/health", (_request, response) => response.json({ status: "ok" }));
app.use("/api/chat", chatRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/companies", companiesRoutes);
app.use("/api/importers", importersRoutes);
app.use("/api/interests", interestsRoutes);
app.use("/api/offers", offersRoutes);
app.use("/api/requirement-forms", formsRoutes);
app.use("/api/requirement-fields", fieldsRoutes);
app.use("/api/document-requirements", documentRequirementsRoutes);
app.use("/api/requests", requestsRoutes);
app.use("/api/match", matchRoutes);
app.use("/api/documents", documentsRoutes);
app.use("/api/agreements", agreementsRoutes);
app.use((_request, response) => response.status(404).json({ error: "Endpoint not found" }));
app.use(errorHandler);

export const server = app.listen(env.port, () => {
  console.log(`Ayni Exports API running at http://localhost:${env.port}`);
});

export default app;
