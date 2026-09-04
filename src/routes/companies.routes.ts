import { Router } from "express";
import { create, mine, publicOne, update, verify } from "../controllers/companies.controller";
import { requireAuth } from "../middleware/auth.middleware";
import { list as reviews } from "../controllers/reviews.controller";
const router=Router();
router.post("/",requireAuth,create);router.get("/me",requireAuth,mine);router.patch("/me",requireAuth,update);router.post("/me/verify",requireAuth,verify);router.get("/:id/reviews",reviews);router.get("/:id/public",publicOne);
export default router;
