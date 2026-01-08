import express from "express"
import { checkAuth, login, signup, updateProfile } from "../controllers/userController.js";
import { protectRoute } from "../middleware/auth.js"
import { validate } from "../middleware/validation.middleware.js";
import { loginSchema, signupSchema, updateProfileSchema } from "../lib/validators.js";

const userRouter = express.Router();

userRouter.post('/signup', validate(signupSchema), signup)
userRouter.post('/login', validate(loginSchema), login)
userRouter.put('/update-profile', protectRoute, validate(updateProfileSchema), updateProfile)
userRouter.put('/check', protectRoute, checkAuth)

export default userRouter;