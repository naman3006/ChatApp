import express from "express";
import { protectRoute } from "../middleware/auth.js";
import {
    createGroup, getGroups, updateGroup, addMember, removeMember, toggleAdmin, deleteGroup, leaveGroup, updateGroupTheme, updateGroupEphemeralMode,
    generateInviteCode, revokeInviteCode, joinGroupViaCode, getGroupByCode
} from "../controllers/groupController.js";


/**
 * @swagger
 * components:
 *   schemas:
 *     Group:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         members:
 *           type: array
 *           items:
 *             type: string
 *         admins:
 *           type: array
 *           items:
 *             type: string
 *         inviteCode:
 *           type: string
 *         ephemeralEnabled:
 *           type: boolean
 */

/**
 * @swagger
 * tags:
 *   name: Groups
 *   description: API for managing groups
 */

const router = express.Router();

/**
 * @swagger
 * /groups/create:
 *   post:
 *     summary: Create a new group
 *     tags: [Groups]
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
 *               - members
 *             properties:
 *               name:
 *                 type: string
 *               members:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Group created
 *       500:
 *         description: Server error
 */
router.post("/create", protectRoute, createGroup);

/**
 * @swagger
 * /groups:
 *   get:
 *     summary: Get all groups for the user
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of groups
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Group'
 *       500:
 *         description: Server error
 */
router.get("/", protectRoute, getGroups);

/**
 * @swagger
 * /groups/update/{id}:
 *   put:
 *     summary: Update group details
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Group ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Group updated
 *       500:
 *         description: Server error
 */
router.put("/update/:id", protectRoute, updateGroup);

/**
 * @swagger
 * /groups/add-member:
 *   put:
 *     summary: Add member to group
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - groupId
 *               - userId
 *             properties:
 *               groupId:
 *                 type: string
 *               userId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Member added
 *       500:
 *         description: Server error
 */
router.put("/add-member", protectRoute, addMember);

/**
 * @swagger
 * /groups/remove-member:
 *   put:
 *     summary: Remove member from group
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - groupId
 *               - userId
 *             properties:
 *               groupId:
 *                 type: string
 *               userId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Member removed
 *       500:
 *         description: Server error
 */
router.put("/remove-member", protectRoute, removeMember);

/**
 * @swagger
 * /groups/toggle-admin:
 *   put:
 *     summary: Toggle admin status
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - groupId
 *               - userId
 *             properties:
 *               groupId:
 *                 type: string
 *               userId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Admin status toggled
 *       500:
 *         description: Server error
 */
router.put("/toggle-admin", protectRoute, toggleAdmin);

/**
 * @swagger
 * /groups/leave:
 *   put:
 *     summary: Leave a group
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - groupId
 *             properties:
 *               groupId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Left group
 *       500:
 *         description: Server error
 */
router.put("/leave", protectRoute, leaveGroup);

/**
 * @swagger
 * /groups/delete/{id}:
 *   delete:
 *     summary: Delete a group
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Group ID
 *     responses:
 *       200:
 *         description: Group deleted
 *       500:
 *         description: Server error
 */
router.delete("/delete/:id", protectRoute, deleteGroup);

/**
 * @swagger
 * /groups/{id}/theme:
 *   put:
 *     summary: Update group theme
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Group ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               theme:
 *                 type: string
 *     responses:
 *       200:
 *         description: Theme updated
 *       500:
 *         description: Server error
 */
router.put("/:id/theme", protectRoute, updateGroupTheme);

/**
 * @swagger
 * /groups/{id}/ephemeral:
 *   put:
 *     summary: Toggle ephemeral mode
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Group ID
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
router.put("/:id/ephemeral", protectRoute, updateGroupEphemeralMode);

// Invite Routes
/**
 * @swagger
 * /groups/{id}/invite:
 *   post:
 *     summary: Generate invite code
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Group ID
 *     responses:
 *       200:
 *         description: Invite code generated
 *       500:
 *         description: Server error
 */
router.post("/:id/invite", protectRoute, generateInviteCode);

/**
 * @swagger
 * /groups/{id}/invite:
 *   delete:
 *     summary: Revoke invite code
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Group ID
 *     responses:
 *       200:
 *         description: Invite code revoked
 *       500:
 *         description: Server error
 */
router.delete("/:id/invite", protectRoute, revokeInviteCode);

/**
 * @swagger
 * /groups/join/code:
 *   post:
 *     summary: Join group via code
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - inviteCode
 *             properties:
 *               inviteCode:
 *                 type: string
 *     responses:
 *       200:
 *         description: Joined group
 *       500:
 *         description: Server error
 */
router.post("/join/code", protectRoute, joinGroupViaCode);

/**
 * @swagger
 * /groups/invite/{code}:
 *   get:
 *     summary: Get group info by invite code
 *     tags: [Groups]
 *     parameters:
 *       - in: path
 *         name: code
 *         schema:
 *           type: string
 *         required: true
 *         description: Invite Code
 *     responses:
 *       200:
 *         description: Group info
 *       500:
 *         description: Server error
 */
router.get("/invite/:code", getGroupByCode);
// Actually implementation plan said: `/invite/:code` -> Get info (public/protected route)
// Let's make it protected for now to ensure only app users can see it, consistent with `joinGroupViaCode` using req.user._id
// Wait, usually the landing page for invite is publicish, but to Join you need to be logged in. 
// If `getGroupByCode` just returns name/icon, it's safe to be public? 
// The controller doesn't use `req.user`. So it can be public.
// But `client` will likely use it inside the app.
// I'll make it public for flexibility.

export default router;
