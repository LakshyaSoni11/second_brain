import { Router } from "express";
import { summarize, autotag } from "../controllers/aiController";
import { authenticate } from "../middlewares/authMiddleware";

const router = Router();

router.use(authenticate);

router.post("/summarize", summarize);
router.post("/autotag", autotag);

export default router;