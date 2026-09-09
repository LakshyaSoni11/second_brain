import { Router } from "express";
import { getProfile, updateProfile, changePassword, deleteAccount } from "../controllers/userController";
import { authenticate } from "../middlewares/authMiddleware";

const router = Router();

router.use(authenticate);

router.get("/profile", getProfile);
router.put("/profile", updateProfile);
router.put("/password", changePassword);
router.delete("/account", deleteAccount);

export default router;