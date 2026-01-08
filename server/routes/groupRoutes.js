import express from "express";
import { protectRoute } from "../middleware/auth.js";
import { createGroup, getGroups, updateGroup, addMember, removeMember, toggleAdmin, deleteGroup, leaveGroup } from "../controllers/groupController.js";

const router = express.Router();

router.post("/create", protectRoute, createGroup);
router.get("/", protectRoute, getGroups);
router.put("/update/:id", protectRoute, updateGroup);
router.put("/add-member", protectRoute, addMember);
router.put("/remove-member", protectRoute, removeMember);
router.put("/toggle-admin", protectRoute, toggleAdmin);
router.put("/leave", protectRoute, leaveGroup);
router.delete("/delete/:id", protectRoute, deleteGroup);

export default router;
