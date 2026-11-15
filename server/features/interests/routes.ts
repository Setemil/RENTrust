import { Router } from "express";
import { requireRole } from "../../shared/auth";
import { create, decide, getOne, listMine, listReceived, openReport, withdraw } from "./handlers";

// /api/v1/interests — renters show interest; landlords and agents read the report and decide.
const router = Router();
const lister = requireRole("LANDLORD", "AGENT");

router.post("/", create);
router.get("/mine", listMine);
router.get("/received", lister, listReceived);
router.get("/:id", getOne);
router.get("/:id/report", openReport);
router.patch("/:id/decision", lister, decide);
router.post("/:id/withdraw", withdraw);

export default router;
