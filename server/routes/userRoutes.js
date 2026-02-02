import express from "express"
import { checkAuth, login, signup, updateProfile, blockUser, unblockUser, reportUser, updateUserTheme, forgotPassword, resetPassword } from "../controllers/userController.js";
import { protectRoute } from "../middleware/auth.js"
import { validate } from "../middleware/validation.middleware.js";
import { loginSchema, signupSchema, updateProfileSchema } from "../lib/validators.js";


/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - fullName
 *         - email
 *         - password
 *       properties:
 *         id:
 *           type: string
 *           description: The auto-generated id of the user
 *         fullName:
 *           type: string
 *           description: The user's full name
 *         email:
 *           type: string
 *           description: The user's email address
 *         profilePic:
 *           type: string
 *           description: URL to the user's profile picture
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The date the user was added
 */

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: The authentication managing API
 */

const userRouter = express.Router();

/**
 * @swagger
 * /auth/signup:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fullName
 *               - email
 *               - password
 *             properties:
 *               fullName:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       201:
 *         description: The user was successfully created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Bad request
 *       500:
 *         description: Server error
 */
userRouter.post('/signup', validate(signupSchema), signup)

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Log in a user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: The user was successfully logged in
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Invalid credentials
 *       500:
 *         description: Server error
 */
userRouter.post('/login', validate(loginSchema), login)

/**
 * @swagger
 * /auth/update-profile:
 *   put:
 *     summary: Update the user's profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *               profilePic:
 *                 type: string
 *                 description: Base64 or URL of the new profile picture
 *     responses:
 *       200:
 *         description: The user profile was updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       500:
 *         description: Server error
 */
userRouter.put('/update-profile', protectRoute, validate(updateProfileSchema), updateProfile)

/**
 * @swagger
 * /auth/check:
 *   put:
 *     summary: Check if the user is authenticated
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: The user is authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 */
userRouter.put('/check', protectRoute, checkAuth)

/**
 * @swagger
 * /auth/block/{id}:
 *   put:
 *     summary: Block a user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The user id
 *     responses:
 *       200:
 *         description: The user was blocked
 *       500:
 *         description: Server error
 */
userRouter.put('/block/:id', protectRoute, blockUser)

/**
 * @swagger
 * /auth/unblock/{id}:
 *   put:
 *     summary: Unblock a user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The user id
 *     responses:
 *       200:
 *         description: The user was unblocked
 *       500:
 *         description: Server error
 */
userRouter.put('/unblock/:id', protectRoute, unblockUser)

/**
 * @swagger
 * /auth/report/{id}:
 *   post:
 *     summary: Report a user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The user id
 *     responses:
 *       200:
 *         description: The user was reported
 *       500:
 *         description: Server error
 */
userRouter.post('/report/:id', protectRoute, reportUser)

/**
 * @swagger
 * /auth/theme/{id}:
 *   put:
 *     summary: Update user theme
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The user id
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
userRouter.put('/theme/:id', protectRoute, updateUserTheme)

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     summary: Request password reset
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Reset email sent
 *       500:
 *         description: Server error
 */
userRouter.post('/forgot-password', forgotPassword)

/**
 * @swagger
 * /auth/reset-password/{token}:
 *   post:
 *     summary: Reset password
 *     tags: [Auth]
 *     parameters:
 *       - in: path
 *         name: token
 *         schema:
 *           type: string
 *         required: true
 *         description: The reset token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *             properties:
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset successful
 *       500:
 *         description: Server error
 */
userRouter.post('/reset-password/:token', resetPassword)

export default userRouter;