import { Router } from "express";
import { complete, completionPdf, createAgreementPdf, storedPdf } from "../controllers/agreements.controller";
import { requireAuth } from "../middleware/auth.middleware";
import { requireVerifiedEmail } from "../middleware/verified-email.middleware";
import { create as createReview } from "../controllers/reviews.controller";

const router = Router();
router.post("/pdf", createAgreementPdf);
router.get("/:id/pdf", requireAuth, requireVerifiedEmail, storedPdf);
router.post("/:id/complete", requireAuth, requireVerifiedEmail, complete);
router.get("/:id/completion-pdf", requireAuth, requireVerifiedEmail, completionPdf);
router.post("/:id/reviews", requireAuth, requireVerifiedEmail, createReview);
export default router;
