import express from "express";
import { generateApiKey, listApiKeys, revokeApiKey, handleExternalMessage } from "../controllers/developerController.js";
import { protectRoute } from "../middleware/auth.js";

const router = express.Router();

// -- Developer Dashboard Routes (Protect with User Session) --
router.post("/developer/keys", protectRoute, generateApiKey);
router.get("/developer/keys", protectRoute, listApiKeys);
router.delete("/developer/keys/:id", protectRoute, revokeApiKey);

// -- External Integration Routes (Public access, protected by API Key Header) --
// Route: /api/external/message
router.post("/external/message", handleExternalMessage);

export default router;
