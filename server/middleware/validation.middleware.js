import { z } from "zod";

export const validate = (schema) => (req, res, next) => {
    try {
        req.body = schema.parse(req.body);
        next();
    } catch (error) {
        if (error instanceof z.ZodError) {
            // Format Zod errors into a readable string or object
            const errorMessage = error.errors?.map((e) => e.message).join(", ") || error.message;
            console.log("Validation Error:", errorMessage);
            console.log("Req Body Keys:", Object.keys(req.body));
            if (req.body.file) console.log("File keys:", Object.keys(req.body.file));
            return res.status(400).json({ success: false, message: errorMessage });
        }
        next(error);
    }
};
