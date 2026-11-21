import { Router } from "express";
import { requireAuth } from "../../shared/auth";
import { limit } from "../../shared/rateLimit";
import { changePassword, forgotPassword, login, me, register, resetPassword } from "./handlers";

// /api/v1/auth — the only routes that work without signing in (register, login and password
// reset). Each has a tight rate limit, because these are what attackers try first.
const router = Router();

router.post("/register", limit({ minutes: 60, max: 10 }), register);
router.post("/login", limit({ minutes: 15, max: 30 }), limit({ minutes: 15, max: 10, by: "email" }), login);
router.post("/password/forgot", limit({ minutes: 60, max: 10 }), limit({ minutes: 15, max: 3, by: "email" }), forgotPassword);
router.post("/password/reset", limit({ minutes: 15, max: 10 }), resetPassword);
router.get("/me", requireAuth, me);
router.patch("/password", requireAuth, limit({ minutes: 15, max: 10, by: "user" }), changePassword);

export default router;
