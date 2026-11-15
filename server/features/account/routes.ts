import { Router } from "express";
import { acceptConsents, sendOtp, status, submitVerification, verifyOtp } from "./handlers";

// /api/v1/account — the signed-in user's own checks.
const router = Router();

router.get("/status", status);
router.post("/otp/send", sendOtp);
router.post("/otp/verify", verifyOtp);
router.post("/consents", acceptConsents);
router.post("/verification", submitVerification);

export default router;
