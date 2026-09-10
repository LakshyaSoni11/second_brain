import { Router } from "express";
import { summarize, autotag, askBrain } from "../controllers/aiController";
import { authenticate } from "../middlewares/authMiddleware";

const router = Router();

router.use(authenticate);

router.post("/summarize", summarize);
router.post("/autotag", autotag);
router.post("/brain", askBrain);

export default router;