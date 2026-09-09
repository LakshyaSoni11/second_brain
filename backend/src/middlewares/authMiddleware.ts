import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
    userId?: string;
}

export const authenticate = (
    req: AuthRequest,          // ✅ Fix 1: use AuthRequest, not plain Request
    res: Response,
    next: NextFunction
): void => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({ message: "Token not provided" });
        return;
    }

    const token = authHeader.split(" ")[1]; // remove the "Bearer " part

    if (!token) {
        res.status(401).json({ message: "Malformed token" });
        return;
    }

    try {
        const secret = process.env.JWT_SECRET!; // non-null assertion: we know it's set
        const decoded = jwt.verify(token, secret) as unknown as {
            userId: string;
        };
        req.userId = decoded.userId;

        next(); 

    } catch (error) {
        res.status(401).json({ message: "Invalid or expired token" });
    }
};
