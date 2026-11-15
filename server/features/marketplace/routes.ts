import { Router } from "express";
import { acceptTerms, detail, save, search, unsave } from "./handlers";

// /api/v1/listings — the marketplace. Signed-in accounts only; it is never public.
const router = Router();

router.get("/", search);
router.get("/:id", detail);
router.post("/:id/terms/accept", acceptTerms);
router.post("/:id/save", save);
router.delete("/:id/save", unsave);

export default router;
