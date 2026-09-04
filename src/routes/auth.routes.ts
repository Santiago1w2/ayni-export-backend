import { Router } from "express";
import rateLimit from "express-rate-limit";
import { login, me, register, resendVerification, verifyEmail } from "../controllers/auth.controller";
import { requireAuth } from "../middleware/auth.middleware";

const router = Router();
const authLimit = rateLimit({ windowMs: 60_000, limit: 20, standardHeaders: true, legacyHeaders: false });
const verifyEmailLimit = rateLimit({ windowMs: 15 * 60_000, limit: 10, standardHeaders: true, legacyHeaders: false });
const resendVerificationLimit = rateLimit({ windowMs: 15 * 60_000, limit: 5, standardHeaders: true, legacyHeaders: false });
router.post("/register", authLimit, register);
router.post("/login", authLimit, login);
router.get("/me", requireAuth, me);
router.post("/verify-email", verifyEmailLimit, verifyEmail);
router.post("/resend-verification", resendVerificationLimit, resendVerification);
export default router;
