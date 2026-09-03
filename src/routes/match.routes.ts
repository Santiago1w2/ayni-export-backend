import { Router } from "express";
import { matchProduct } from "../controllers/match.controller";

const router = Router();
router.post("/", matchProduct);
export default router;
