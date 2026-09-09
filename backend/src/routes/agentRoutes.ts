import { Router } from "express";
import { chat, listAgents, runAgentHandler } from "../controllers/agentController";
import { authenticate } from "../middlewares/authMiddleware";

const router = Router();

router.use(authenticate);

router.get("/", listAgents);
router.post("/run", runAgentHandler);
router.post("/chat", chat);

export default router;