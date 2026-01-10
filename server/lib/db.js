import mongoose from "mongoose";

export const connectDB = async () => {
    const MAX_RETRIES = 5;
    let retries = 0;

    while (retries < MAX_RETRIES) {
        try {
            console.log(`[MongoDB] Attempting connection (Attempt ${retries + 1}/${MAX_RETRIES})...`);
            await mongoose.connect(`${process.env.MONGODB_URI}/chat-app`, {
                serverSelectionTimeoutMS: 15000, // Increased timeout to 15s to handle potential slow DNS
                socketTimeoutMS: 45000,
                family: 4, // Use IPv4, skip trying IPv6
            });
            console.log(`[MongoDB] Connected successfully to host: ${mongoose.connection.host}`);

            // Set up listeners ONLY after successful connection to avoid duplicates on retries
            // although Mongoose handles this well, it's cleaner.

            mongoose.connection.on("disconnected", () => {
                console.warn("[MongoDB] Disconnected! Attempting auto-reconnect...");
            });

            mongoose.connection.on("error", (err) => {
                console.error('[MongoDB] Runtime connection error:', err);
            });

            return; // Success, exit function

        } catch (error) {
            retries++;
            console.error(`[MongoDB] Connection attempt ${retries} failed:`, error.message);

            if (retries >= MAX_RETRIES) {
                console.error("[MongoDB] Max retries reached. Could not connect to database.");
                // Ensure the logs are visible
            } else {
                console.log(`[MongoDB] Retrying in 5 seconds...`);
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }
    }
};