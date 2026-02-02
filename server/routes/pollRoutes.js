import express from "express";
import { protectRoute } from "../middleware/auth.js";
import { createPoll, votePoll } from "../controllers/pollController.js";


/**
 * @swagger
 * components:
 *   schemas:
 *     Poll:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         question:
 *           type: string
 *         options:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               text:
 *                 type: string
 *               votes:
 *                 type: array
 *                 items:
 *                   type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * tags:
 *   name: Polls
 *   description: API for managing polls
 */

const router = express.Router();

/**
 * @swagger
 * /polls/create:
 *   post:
 *     summary: Create a new poll
 *     tags: [Polls]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - question
 *               - options
 *             properties:
 *               question:
 *                 type: string
 *               options:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Poll created
 *       500:
 *         description: Server error
 */
router.post("/create", protectRoute, createPoll);

/**
 * @swagger
 * /polls/{id}/vote:
 *   put:
 *     summary: Vote on a poll
 *     tags: [Polls]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Poll ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - optionIndex
 *             properties:
 *               optionIndex:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Vote recorded
 *       500:
 *         description: Server error
 */
router.put("/:id/vote", protectRoute, votePoll);

export default router;
