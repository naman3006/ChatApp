export const errorHandler = (err, req, res, next) => {
    console.error(err.stack); // Log the stack for debugging

    const statusCode = err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(statusCode).json({
        success: false,
        message,
        // Only show stack in development
        stack: process.env.NODE_ENV === "production" ? null : err.stack,
    });
};
