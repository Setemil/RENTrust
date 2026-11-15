import { Router } from "express";
import { requireAuth } from "../../shared/auth";
import { changePassword, login, me, register } from "./handlers";

// /api/v1/auth — the only routes that work without signing in (register and login).
const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", requireAuth, me);
router.patch("/password", requireAuth, changePassword);

export default router;
