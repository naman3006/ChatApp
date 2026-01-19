import express from "express";
import { protectRoute } from "../middleware/auth.js";
import {
    createGroup, getGroups, updateGroup, addMember, removeMember, toggleAdmin, deleteGroup, leaveGroup, updateGroupTheme, updateGroupEphemeralMode,
    generateInviteCode, revokeInviteCode, joinGroupViaCode, getGroupByCode
} from "../controllers/groupController.js";

const router = express.Router();

router.post("/create", protectRoute, createGroup);
router.get("/", protectRoute, getGroups);
router.put("/update/:id", protectRoute, updateGroup);
router.put("/add-member", protectRoute, addMember);
router.put("/remove-member", protectRoute, removeMember);
router.put("/toggle-admin", protectRoute, toggleAdmin);
router.put("/leave", protectRoute, leaveGroup);
router.delete("/delete/:id", protectRoute, deleteGroup);
router.put("/:id/theme", protectRoute, updateGroupTheme);
router.put("/:id/ephemeral", protectRoute, updateGroupEphemeralMode);

// Invite Routes
router.post("/:id/invite", protectRoute, generateInviteCode);
router.delete("/:id/invite", protectRoute, revokeInviteCode);
router.post("/join/code", protectRoute, joinGroupViaCode);
router.get("/invite/:code", getGroupByCode); // Public (no protectRoute needed for basic info, or maybe protect if intent is user must be logged in to view app)
// Actually implementation plan said: `/invite/:code` -> Get info (public/protected route)
// Let's make it protected for now to ensure only app users can see it, consistent with `joinGroupViaCode` using req.user._id
// Wait, usually the landing page for invite is publicish, but to Join you need to be logged in. 
// If `getGroupByCode` just returns name/icon, it's safe to be public? 
// The controller doesn't use `req.user`. So it can be public.
// But `client` will likely use it inside the app.
// I'll make it public for flexibility.

export default router;
