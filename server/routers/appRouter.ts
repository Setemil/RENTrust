import { Router } from "express";
import * as account from "../controllers/accountController";
import * as admin from "../controllers/adminController";
import * as interests from "../controllers/interestController";
import * as market from "../controllers/marketplaceController";
import * as notifications from "../controllers/notificationController";
import * as properties from "../controllers/propertyController";
import { requireAuth, requireRole } from "../middleware/auth";

// Everything here needs a signed-in account; the marketplace is never public (spec section 2).
const router = Router();
router.use(requireAuth);

router.get("/account/status", account.status);
router.post("/account/otp/send", account.sendOtp);
router.post("/account/otp/verify", account.verifyOtp);
router.post("/account/consents", account.acceptConsents);
router.post("/account/verification", account.submitVerification);

router.get("/listings", market.search);
router.get("/listings/:id", market.detail);
router.post("/listings/:id/terms/accept", market.acceptTerms);
router.post("/listings/:id/save", market.save);
router.delete("/listings/:id/save", market.unsave);

const lister = requireRole("LANDLORD", "AGENT");
router.get("/properties", lister, properties.listMine);
router.post("/properties", lister, properties.create);
router.get("/properties/:id", lister, properties.getOne);
router.patch("/properties/:id", lister, properties.update);
router.put("/properties/:id/terms", lister, properties.updateTerms);
router.post("/properties/:id/submit", lister, properties.submit);
router.post("/properties/:id/availability", lister, properties.setAvailability);

router.post("/interests", interests.create);
router.get("/interests/mine", interests.listMine);
router.get("/interests/received", lister, interests.listReceived);
router.get("/interests/:id", interests.getOne);
router.get("/interests/:id/report", interests.openReport);
router.patch("/interests/:id/decision", lister, interests.decide);
router.post("/interests/:id/withdraw", interests.withdraw);

router.get("/notifications", notifications.list);
router.get("/notifications/unread-count", notifications.unreadCount);
router.post("/notifications/read-all", notifications.markAllRead);
router.post("/notifications/:id/read", notifications.markRead);

const isAdmin = requireRole("ADMIN");
router.get("/admin/overview", isAdmin, admin.overview);
router.get("/admin/verifications", isAdmin, admin.verifications);
router.patch("/admin/verifications/:id", isAdmin, admin.reviewVerification);
router.get("/admin/listings", isAdmin, admin.listings);
router.patch("/admin/listings/:id", isAdmin, admin.moderateListing);
router.get("/admin/users", isAdmin, admin.users);
router.patch("/admin/users/:id", isAdmin, admin.setUserStatus);
router.get("/admin/interests", isAdmin, admin.interests);
router.get("/admin/audit", isAdmin, admin.auditLog);

export default router;
