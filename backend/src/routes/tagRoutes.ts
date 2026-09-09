import { Router } from "express";
import { listTags, renameTag, mergeTags, deleteTag } from "../controllers/tagsController";
import { authenticate } from "../middlewares/authMiddleware";

const router = Router();

router.use(authenticate);

router.get("/", listTags);
router.put("/:tag", renameTag);
router.post("/merge", mergeTags);
router.delete("/:tag", deleteTag);

export default router;