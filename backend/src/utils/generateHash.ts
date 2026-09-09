import crypto from "crypto";

export const generateHash = (length: number = 12): string =>{
    return crypto.randomBytes(length).toString("hex").slice(0, length)
}

