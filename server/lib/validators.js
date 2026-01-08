import { z } from "zod";

export const signupSchema = z.object({
    fullName: z.string().min(1, "Full name is required"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    bio: z.string().optional(),
});

export const loginSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(1, "Password is required"),
});

export const updateProfileSchema = z.object({
    fullName: z.string().min(1, "Full name is required").optional(),
    bio: z.string().optional(),
    profilePic: z.string().optional(),
    privacy: z.object({
        ghostMode: z.boolean().optional(),
        lastSeen: z.boolean().optional(),
        readReceipts: z.boolean().optional(),
        undoWindow: z.number().optional(),
    }).optional(),
});

export const messageSchema = z.object({
    text: z.string().optional(),
    image: z.string().optional(),
    audio: z.string().optional(),
    groupId: z.string().optional(),
}).refine(data => data.text || data.image || data.audio, {
    message: "Either text, image, or audio must be provided",
    path: ["text"],
});
