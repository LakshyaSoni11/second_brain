import { Router } from "express";
import {
    getContent,
    addContent,
    updateContent,
    deleteContent,
    toggleFavorite,
    getStats,
} from "../controllers/contentController";
import { bulkDelete, bulkFavorite, bulkTag } from "../controllers/contentBulkController";
import { exportContent, importContent } from "../controllers/exportController";
import { authenticate } from "../middlewares/authMiddleware";

const router = Router();

router.use(authenticate);

// NOTE: bulk & stats routes must be registered before /:id-style routes
router.get("/stats", getStats);
router.post("/bulk/delete", bulkDelete);
router.post("/bulk/favorite", bulkFavorite);
router.post("/bulk/tag", bulkTag);
router.get("/export", exportContent);
router.post("/import", importContent);
router.get("/", getContent);
router.post("/", addContent);
router.put("/:id", updateContent);
router.post("/:id/favorite", toggleFavorite);
router.delete("/:id", deleteContent);

export default router;