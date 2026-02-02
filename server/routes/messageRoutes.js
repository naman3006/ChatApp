import express from "express"
import { protectRoute } from "../middleware/auth.js";
import { deleteMessage, getMessages, getUserForSidebar, markMessageAsSeen, sendMessage, undoDeleteMessage, updateMessage, addReaction, pinMessage, unpinMessage, forwardMessages, searchMessages, translateMessage, toggleStarMessage, getStarredMessages } from "../controllers/messageController.js";
import { validate } from "../middleware/validation.middleware.js";
import { messageSchema } from "../lib/validators.js";



/**
 * @swagger
 * components:
 *   schemas:
 *     Message:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: The auto-generated id of the message
 *         senderId:
 *           type: string
 *           description: The id of the sender
 *         receiverId:
 *           type: string
 *           description: The id of the receiver
 *         text:
 *           type: string
 *           description: The message content
 *         image:
 *           type: string
 *           description: URL of the image if any
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp
 *         isSeen:
 *           type: boolean
 *           description: Read status
 */

/**
 * @swagger
 * tags:
 *   name: Messages
 *   description: API for managing messages and conversations
 */

const messageRouter = express.Router();

/**
 * @swagger
 * /messages/users:
 *   get:
 *     summary: Get users for sidebar
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users for sidebar
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 *       500:
 *         description: Server error
 */
messageRouter.get("/users", protectRoute, getUserForSidebar)

/**
 * @swagger
 * /messages/search:
 *   get:
 *     summary: Search messages
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search query
 *     responses:
 *       200:
 *         description: Search results
 *       500:
 *         description: Server error
 */
messageRouter.get("/search", protectRoute, searchMessages)

/**
 * @swagger
 * /messages/starred:
 *   get:
 *     summary: Get all starred messages
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of starred messages
 *       500:
 *         description: Server error
 */
messageRouter.get("/starred", protectRoute, getStarredMessages)

/**
 * @swagger
 * /messages/star/{id}:
 *   put:
 *     summary: Toggle star status of a message
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Message ID
 *     responses:
 *       200:
 *         description: Star status updated
 *       500:
 *         description: Server error
 */
messageRouter.put("/star/:id", protectRoute, toggleStarMessage)

/**
 * @swagger
 * /messages/{id}:
 *   get:
 *     summary: Get messages with a specific user
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: User ID to get conversation with
 *     responses:
 *       200:
 *         description: List of messages
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Message'
 *       500:
 *         description: Server error
 */
messageRouter.get("/:id", protectRoute, getMessages)

/**
 * @swagger
 * /messages/translate/{id}:
 *   post:
 *     summary: Translate a message
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Message ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - targetLanguage
 *             properties:
 *               targetLanguage:
 *                 type: string
 *                 example: "es"
 *     responses:
 *       200:
 *         description: Message translated
 *       500:
 *         description: Server error
 */
messageRouter.post("/translate/:id", protectRoute, translateMessage)

/**
 * @swagger
 * /messages/mark/{id}:
 *   put:
 *     summary: Mark messages as seen
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: User ID (sender) or Message ID depending on implementation
 *     responses:
 *       200:
 *         description: Messages marked as seen
 *       500:
 *         description: Server error
 */
messageRouter.put("/mark/:id", protectRoute, markMessageAsSeen)

/**
 * @swagger
 * /messages/send/{id}:
 *   post:
 *     summary: Send a message
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Receiver ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               text:
 *                 type: string
 *               image:
 *                 type: string
 *     responses:
 *       201:
 *         description: Message sent
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Message'
 *       500:
 *         description: Server error
 */
messageRouter.post("/send/:id", protectRoute, validate(messageSchema), sendMessage)

/**
 * @swagger
 * /messages/{id}:
 *   put:
 *     summary: Update a message
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Message ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               text:
 *                 type: string
 *     responses:
 *       200:
 *         description: Message updated
 *       500:
 *         description: Server error
 */
messageRouter.put("/:id", protectRoute, updateMessage);

/**
 * @swagger
 * /messages/{id}/react:
 *   post:
 *     summary: Add reaction to a message
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Message ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - emoji
 *             properties:
 *               emoji:
 *                 type: string
 *     responses:
 *       200:
 *         description: Reaction added
 *       500:
 *         description: Server error
 */
messageRouter.post("/:id/react", protectRoute, addReaction);

/**
 * @swagger
 * /messages/{id}:
 *   delete:
 *     summary: Delete a message
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Message ID
 *     responses:
 *       200:
 *         description: Message deleted
 *       500:
 *         description: Server error
 */
messageRouter.delete("/:id", protectRoute, deleteMessage);

/**
 * @swagger
 * /messages/undo/{id}:
 *   put:
 *     summary: Undo delete message
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Message ID
 *     responses:
 *       200:
 *         description: Message restored
 *       500:
 *         description: Server error
 */
messageRouter.put("/undo/:id", protectRoute, undoDeleteMessage)

/**
 * @swagger
 * /messages/{id}/pin:
 *   post:
 *     summary: Pin a message
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Message ID
 *     responses:
 *       200:
 *         description: Message pinned
 *       500:
 *         description: Server error
 */
messageRouter.post("/:id/pin", protectRoute, pinMessage);

/**
 * @swagger
 * /messages/{id}/unpin:
 *   post:
 *     summary: Unpin a message
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Message ID
 *     responses:
 *       200:
 *         description: Message unpinned
 *       500:
 *         description: Server error
 */
messageRouter.post("/:id/unpin", protectRoute, unpinMessage);

/**
 * @swagger
 * /messages/forward:
 *   post:
 *     summary: Forward messages
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - messageIds
 *               - userIds
 *             properties:
 *               messageIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               userIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Messages forwarded
 *       500:
 *         description: Server error
 */
messageRouter.post("/forward", protectRoute, forwardMessages);

export default messageRouter;