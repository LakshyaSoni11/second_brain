import { Router } from "express";
import { authenticate } from "../middlewares/authMiddleware";
import { emailInbound, webShare } from "../controllers/captureController";


const router = Router();
router.post("/web-share", authenticate, webShare);
router.post("/email/inbound", emailInbound);

export default router;