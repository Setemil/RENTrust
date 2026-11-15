import { Router } from "express";
import { requireRole } from "../../shared/auth";
import * as admin from "./handlers";

// /api/v1/admin — RENTrust staff only.
const router = Router();
router.use(requireRole("ADMIN"));

router.get("/overview", admin.overview);
router.get("/verifications", admin.verifications);
router.patch("/verifications/:id", admin.reviewVerification);
router.get("/listings", admin.listings);
router.patch("/listings/:id", admin.moderateListing);
router.get("/users", admin.users);
router.patch("/users/:id", admin.setUserStatus);
router.get("/interests", admin.interests);
router.get("/audit", admin.auditLog);

export default router;
