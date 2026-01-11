import express from "express";
import { protectRoute } from "../middleware/auth.js";
import { createStatus, getStatuses, viewStatus, deleteStatus } from "../controllers/statusController.js";

const router = express.Router();

router.use(protectRoute);

router.get("/", getStatuses);
router.post("/", createStatus);
router.post("/:id/view", viewStatus);
router.delete("/:id", deleteStatus);

export default router;
