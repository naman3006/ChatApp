import express from "express";
import { protectRoute } from "../middleware/auth.js";
import { toggleEphemeralMode, getConversationSettings } from "../controllers/conversationController.js";


/**
 * @swagger
 * tags:
 *   name: Conversations
 *   description: API for conversation settings
 */

const router = express.Router();

/**
 * @swagger
 * /conversations/ephemeral/{id}:
 *   put:
 *     summary: Toggle ephemeral mode for a conversation
 *     tags: [Conversations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Conversation ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               enabled:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Ephemeral mode updated
 *       500:
 *         description: Server error
 */
router.put("/ephemeral/:id", protectRoute, toggleEphemeralMode);

/**
 * @swagger
 * /conversations/ephemeral/{id}:
 *   get:
 *     summary: Get conversation settings
 *     tags: [Conversations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Conversation ID
 *     responses:
 *       200:
 *         description: Conversation settings
 *       500:
 *         description: Server error
 */
router.get("/ephemeral/:id", protectRoute, getConversationSettings);

export default router;
