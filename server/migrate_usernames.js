import mongoose from "mongoose";
import User from "./models/User.js"; // Adjust path if running from server root
import dotenv from "dotenv";

dotenv.config();

const migrate = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to MongoDB");

        const users = await User.find({ username: { $exists: false } });
        console.log(`Found ${users.length} users without username`);

        for (const user of users) {
            const baseUsername = user.email.split('@')[0];
            const username = `${baseUsername}${Math.floor(Math.random() * 10000)}`;
            user.username = username;
            await user.save();
            console.log(`Updated user ${user.email} -> ${username}`);
        }

        console.log("Migration complete");
        process.exit(0);
    } catch (error) {
        console.error("Migration error:", error);
        process.exit(1);
    }
};

migrate();
