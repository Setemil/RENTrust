import { Router } from "express";
import { limit } from "../../shared/rateLimit";
import { acceptConsents, sendOtp, status, submitVerification, verifyOtp } from "./handlers";

// /api/v1/account — the signed-in user's own checks.
const router = Router();

router.get("/status", status);
// Each code sent costs a WhatsApp or SMS message, so sending is capped per user.
router.post("/otp/send", limit({ minutes: 15, max: 5, by: "user" }), sendOtp);
router.post("/otp/verify", limit({ minutes: 15, max: 10, by: "user" }), verifyOtp);
router.post("/consents", acceptConsents);
router.post("/verification", submitVerification);

export default router;
