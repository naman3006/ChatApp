import express from "express";
import { protectRoute } from "../middleware/auth.js";
import { toggleEphemeralMode, getConversationSettings } from "../controllers/conversationController.js";

const router = express.Router();

router.put("/ephemeral/:id", protectRoute, toggleEphemeralMode);
router.get("/ephemeral/:id", protectRoute, getConversationSettings);

export default router;
