import { Router } from "express";
import { toggleShare, getShareStatus, getSharedBrain } from "../controllers/shareController";
import { authenticate } from "../middlewares/authMiddleware";

const router = Router();

// Protected endpoint to enable/disable sharing
router.post("/share", authenticate, toggleShare);

// Protected endpoint to get share status
router.get("/share/status", authenticate, getShareStatus);

// Public endpoint to view a shared brain by hash
router.get("/:hash", getSharedBrain);

export default router;
