import { Router } from "express";
import { requireRole } from "../../shared/auth";
import { create, getOne, listMine, setAvailability, submit, update, updateTerms } from "./handlers";

// /api/v1/properties — landlords and agents managing their own properties.
const router = Router();
router.use(requireRole("LANDLORD", "AGENT"));

router.get("/", listMine);
router.post("/", create);
router.get("/:id", getOne);
router.patch("/:id", update);
router.put("/:id/terms", updateTerms);
router.post("/:id/submit", submit);
router.post("/:id/availability", setAvailability);

export default router;
