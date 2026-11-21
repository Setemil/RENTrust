import { Router } from "express";
import { requireRole } from "../../shared/auth";
import { addPhoto, create, getOne, listMine, makeCover, photoUpload, removePhoto, setAvailability, submit, update, updateTerms } from "./handlers";

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
router.post("/:id/photos/upload", photoUpload);
router.post("/:id/photos", addPhoto);
router.post("/:id/photos/:photoId/cover", makeCover);
router.delete("/:id/photos/:photoId", removePhoto);

export default router;
