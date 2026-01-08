import express from "express"
import { protectRoute } from "../middleware/auth.js"
import { getMessages, getUserForSidebar, markMessageAsSeen, sendMessage, updateMessage, deleteMessage } from "../controllers/messageController.js"
import { validate } from "../middleware/validation.middleware.js";
import { messageSchema } from "../lib/validators.js";


const messageRouter = express.Router();

messageRouter.get("/users", protectRoute, getUserForSidebar)

messageRouter.get("/:id", protectRoute, getMessages)

messageRouter.put("/mark/:id", protectRoute, markMessageAsSeen)

messageRouter.post("/send/:id", protectRoute, validate(messageSchema), sendMessage)
messageRouter.put("/update/:id", protectRoute, updateMessage)
messageRouter.delete("/delete/:id", protectRoute, deleteMessage)

export default messageRouter;