import { Router } from "express";
import { complete, completionPdf, createAgreementPdf, storedPdf } from "../controllers/agreements.controller";
import { requireAuth } from "../middleware/auth.middleware";

const router = Router();
router.post("/pdf", createAgreementPdf);
router.get("/:id/pdf", requireAuth, storedPdf);
router.post("/:id/complete", requireAuth, complete);
router.get("/:id/completion-pdf", requireAuth, completionPdf);
export default router;
