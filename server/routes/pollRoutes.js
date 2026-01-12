import express from "express";
import { protectRoute } from "../middleware/auth.js";
import { createPoll, votePoll } from "../controllers/pollController.js";

const router = express.Router();

router.post("/create", protectRoute, createPoll);
router.put("/:id/vote", protectRoute, votePoll);

export default router;
