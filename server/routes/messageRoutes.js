import express from "express"
import { protectRoute } from "../middleware/auth.js";
import { deleteMessage, getMessages, getUserForSidebar, markMessageAsSeen, sendMessage, undoDeleteMessage, updateMessage, addReaction, pinMessage, unpinMessage, forwardMessages, searchMessages } from "../controllers/messageController.js";
import { validate } from "../middleware/validation.middleware.js";
import { messageSchema } from "../lib/validators.js";


const messageRouter = express.Router();

messageRouter.get("/users", protectRoute, getUserForSidebar)
messageRouter.get("/search", protectRoute, searchMessages)
messageRouter.get("/:id", protectRoute, getMessages)
messageRouter.put("/mark/:id", protectRoute, markMessageAsSeen)
messageRouter.post("/send/:id", protectRoute, validate(messageSchema), sendMessage)
messageRouter.put("/:id", protectRoute, updateMessage);
messageRouter.post("/:id/react", protectRoute, addReaction);
messageRouter.delete("/:id", protectRoute, deleteMessage);
messageRouter.put("/undo/:id", protectRoute, undoDeleteMessage)
messageRouter.post("/:id/pin", protectRoute, pinMessage);
messageRouter.post("/:id/unpin", protectRoute, unpinMessage);
messageRouter.post("/forward", protectRoute, forwardMessages);

export default messageRouter;