import express from "express";
import { protectRoute } from "../middleware/auth.js";
import { createStatus, getStatuses, viewStatus, deleteStatus } from "../controllers/statusController.js";


/**
 * @swagger
 * components:
 *   schemas:
 *     Status:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         userId:
 *           type: string
 *         imageUrl:
 *           type: string
 *         caption:
 *           type: string
 *         views:
 *           type: array
 *           items:
 *             type: string
 *             description: User IDs who viewed the status
 *         createdAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * tags:
 *   name: Status
 *   description: API for user status updates
 */

const router = express.Router();

router.use(protectRoute);

/**
 * @swagger
 * /status:
 *   get:
 *     summary: Get all statuses
 *     tags: [Status]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of statuses
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Status'
 *       500:
 *         description: Server error
 */
router.get("/", getStatuses);

/**
 * @swagger
 * /status:
 *   post:
 *     summary: Create a new status
 *     tags: [Status]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - imageUrl
 *             properties:
 *               imageUrl:
 *                 type: string
 *               caption:
 *                 type: string
 *     responses:
 *       201:
 *         description: Status created
 *       500:
 *         description: Server error
 */
router.post("/", createStatus);

/**
 * @swagger
 * /status/{id}/view:
 *   post:
 *     summary: View a status
 *     tags: [Status]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Status ID
 *     responses:
 *       200:
 *         description: Status viewed
 *       500:
 *         description: Server error
 */
router.post("/:id/view", viewStatus);

/**
 * @swagger
 * /status/{id}:
 *   delete:
 *     summary: Delete a status
 *     tags: [Status]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Status ID
 *     responses:
 *       200:
 *         description: Status deleted
 *       500:
 *         description: Server error
 */
router.delete("/:id", deleteStatus);

export default router;
