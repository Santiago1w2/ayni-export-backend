import { Router } from "express";
import multer from "multer";
import { analyzeDocument } from "../controllers/documents.controller";
import { requireAuth } from "../middleware/auth.middleware";
import rateLimit from "express-rate-limit";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
});
router.post("/analyze", requireAuth, rateLimit({windowMs:60_000,limit:20}), upload.single("document"), analyzeDocument);
export default router;
