import { Router } from "express";
import { changePassword, login, me, register } from "../controllers/authController";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", requireAuth, me);
router.patch("/password", requireAuth, changePassword);

export default router;
