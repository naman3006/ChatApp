import express from "express";
import { generateApiKey, listApiKeys, revokeApiKey, handleExternalMessage } from "../controllers/developerController.js";
import { protectRoute } from "../middleware/auth.js";


/**
 * @swagger
 * tags:
 *   name: Developer
 *   description: Developer API keys and integration
 */

const router = express.Router();

// -- Developer Dashboard Routes (Protect with User Session) --
/**
 * @swagger
 * /developer/keys:
 *   post:
 *     summary: Generate a new API key
 *     tags: [Developer]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: API key generated
 *       500:
 *         description: Server error
 */
router.post("/developer/keys", protectRoute, generateApiKey);

/**
 * @swagger
 * /developer/keys:
 *   get:
 *     summary: List API keys
 *     tags: [Developer]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of API keys
 *       500:
 *         description: Server error
 */
router.get("/developer/keys", protectRoute, listApiKeys);

/**
 * @swagger
 * /developer/keys/{id}:
 *   delete:
 *     summary: Revoke an API key
 *     tags: [Developer]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Key ID
 *     responses:
 *       200:
 *         description: Key revoked
 *       500:
 *         description: Server error
 */
router.delete("/developer/keys/:id", protectRoute, revokeApiKey);

// -- External Integration Routes (Public access, protected by API Key Header) --
// Route: /api/external/message
/**
 * @swagger
 * /external/message:
 *   post:
 *     summary: Send detailed message via external API
 *     tags: [Developer]
 *     parameters:
 *       - in: header
 *         name: x-api-key
 *         schema:
 *           type: string
 *         required: true
 *         description: API Key
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - toUserEmail
 *               - content
 *             properties:
 *               toUserEmail:
 *                 type: string
 *               content:
 *                 type: string
 *     responses:
 *       200:
 *         description: Message sent
 *       401:
 *         description: Invalid API Key
 *       500:
 *         description: Server error
 */
router.post("/external/message", handleExternalMessage);

export default router;
