import { Router } from "express";
import { list, markAllRead, markRead, unreadCount } from "./handlers";

// /api/v1/notifications — the signed-in user's in-app notifications.
const router = Router();

router.get("/", list);
router.get("/unread-count", unreadCount);
router.post("/read-all", markAllRead);
router.post("/:id/read", markRead);

export default router;
