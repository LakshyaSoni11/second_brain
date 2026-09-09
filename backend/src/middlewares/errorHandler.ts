import { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";

export class AppError extends Error {
    statusCode: number;
    constructor(statusCode: number, message: string) {
        super(message);
        this.statusCode = statusCode;
        this.name = "AppError";
    }
}

export const notFound = (req: Request, _res: Response, next: NextFunction): void => {
    next(new AppError(404, `Route not found: ${req.method} ${req.originalUrl}`));
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler = (
    err: unknown,
    _req: Request,
    res: Response,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _next: NextFunction
): void => {
    if (err instanceof AppError) {
        res.status(err.statusCode).json({ message: err.message });
        return;
    }
    if (err instanceof mongoose.Error.ValidationError) {
        res.status(400).json({ message: err.message });
        return;
    }
    if (err instanceof mongoose.Error.CastError) {
        res.status(400).json({ message: "Invalid id format" });
        return;
    }
    console.error("Unhandled error:", err);
    res.status(500).json({ message: "Internal server error" });
};