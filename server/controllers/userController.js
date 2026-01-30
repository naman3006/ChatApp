import { generateToken } from "../lib/utils.js";
import User from "../models/User.js";
import bcrypt from "bcryptjs";
import cloudinary from "../lib/cloudinary.js";
import { sendResetEmail } from "../lib/email.js";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";

//Signup a new user
export const signup = async (req, res) => {
  const { fullName, email, password, bio } = req.body;

  try {
    const user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ success: false, message: "Account already exists" });
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate username
    const baseUsername = email.split('@')[0];
    const username = `${baseUsername}${Math.floor(Math.random() * 10000)}`;

    const newUser = await User.create({
      fullName,
      email,
      password: hashedPassword,
      username,
      bio,
    });
    const token = generateToken(newUser._id);
    res
      .status(201)
      .json({
        success: true,
        userData: newUser,
        token,
        message: "Account created successfully",
      });
  } catch (err) {
    console.log(err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const userData = await User.findOne({ email });
    if (!userData) {
      return res.status(400).json({ success: false, message: "Invalid credentials" });
    }

    const isPasswordCorrect = await bcrypt.compare(password, userData.password);

    if (!isPasswordCorrect) {
      return res.status(400).json({ success: false, message: "Invalid credentials" });
    }

    const token = generateToken(userData._id);

    res.json({
      success: true,
      userData,
      token,
      message: "Login successful",
    });
  } catch (err) {
    console.log(err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

//controller to check if user is authenticated
export const checkAuth = (req, res) => {
  res.json({ success: true, user: req.user });
};

//controller to update user profile details
export const updateProfile = async (req, res) => {
  try {
    const { profilePic, bio, fullName } = req.body;
    const userId = req.user._id;
    let updatedUser;

    if (profilePic === "") {
      updatedUser = await User.findByIdAndUpdate(
        userId,
        { profilePic: "", bio, fullName, privacy: req.body.privacy },
        { new: true }
      );
    } else if (!profilePic) {
      updatedUser = await User.findByIdAndUpdate(
        userId,
        { bio, fullName, privacy: req.body.privacy },
        { new: true }
      );
    } else {
      const upload = await cloudinary.uploader.upload(profilePic);

      updatedUser = await User.findByIdAndUpdate(
        userId,
        { profilePic: upload.secure_url, bio, fullName, privacy: req.body.privacy },
        { new: true }
      );
    }
    res.json({ success: true, user: updatedUser });
  } catch (err) {
    console.log(err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const blockUser = async (req, res) => {
  try {
    const { id: userToBlockId } = req.params;
    const userId = req.user._id;

    if (userId.toString() === userToBlockId) {
      return res.status(400).json({ success: false, message: "Cannot block yourself" });
    }

    const user = await User.findById(userId);
    if (!user.blockedUsers.includes(userToBlockId)) {
      user.blockedUsers.push(userToBlockId);
      await user.save();
    }

    res.json({ success: true, message: "User blocked successfully", blockedUsers: user.blockedUsers });
  } catch (error) {
    console.log("Error in blockUser:", error.message);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const unblockUser = async (req, res) => {
  try {
    const { id: userToUnblockId } = req.params;
    const userId = req.user._id;

    const user = await User.findById(userId);
    user.blockedUsers = user.blockedUsers.filter(id => id.toString() !== userToUnblockId);
    await user.save();

    res.json({ success: true, message: "User unblocked successfully", blockedUsers: user.blockedUsers });
  } catch (error) {
    console.log("Error in unblockUser:", error.message);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

import Report from "../models/Report.js";

export const reportUser = async (req, res) => {
  try {
    const { id: reportedId } = req.params;
    const { reason, description } = req.body;
    const reporterId = req.user._id;

    if (reporterId.toString() === reportedId) {
      return res.status(400).json({ success: false, message: "Cannot report yourself" });
    }

    const newReport = await Report.create({
      reporterId,
      reportedId,
      reason,
      description
    });

    res.status(201).json({ success: true, message: "User reported successfully", report: newReport });
  } catch (error) {
    console.log("Error in reportUser:", error.message);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const updateUserTheme = async (req, res) => {
  try {
    const { id: partnerId } = req.params;
    const { theme } = req.body; // { type, value, id }
    const userId = req.user._id;

    const user = await User.findById(userId);

    if (!user.chatThemes) {
      user.chatThemes = new Map();
    }

    user.chatThemes.set(partnerId, theme);
    await user.save();

    res.json({ success: true, message: "Theme updated", theme });
  } catch (error) {
    console.log("Error in updateUserTheme:", error.message);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Create a temporary token specifically for password reset
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '15m' });
    const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
    const resetUrl = `${clientUrl}/reset-password/${token}`;

    const info = await sendResetEmail(email, resetUrl);
    const previewUrl = nodemailer.getTestMessageUrl(info);

    res.json({ success: true, message: "Password reset email sent", previewUrl });
  } catch (error) {
    console.log("Error in forgotPassword:", error.message);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded) {
      return res.status(400).json({ success: false, message: "Invalid or expired token" });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    await user.save();

    res.json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    console.log("Error in resetPassword:", error.message);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
