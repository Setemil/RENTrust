import { Router } from "express";
import accountRoutes from "./features/account/routes";
import adminRoutes from "./features/admin/routes";
import authRoutes from "./features/auth/routes";
import interestRoutes from "./features/interests/routes";
import marketplaceRoutes from "./features/marketplace/routes";
import notificationRoutes from "./features/notifications/routes";
import propertyRoutes from "./features/properties/routes";
import { requireAuth } from "./shared/auth";

// Every API route, mounted under /api/v1. To add a feature, create its folder in features/
// and add one line here.
const api = Router();

api.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});
api.use("/auth", authRoutes);

// Everything below needs a signed-in account. The marketplace is never public (spec section 2).
api.use(requireAuth);
api.use("/account", accountRoutes);
api.use("/listings", marketplaceRoutes);
api.use("/properties", propertyRoutes);
api.use("/interests", interestRoutes);
api.use("/notifications", notificationRoutes);
api.use("/admin", adminRoutes);

export default api;
