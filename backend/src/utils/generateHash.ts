import crypto from "crypto";

export const generateHash = (length: number = 24): string =>{
    return crypto.randomBytes(Math.ceil(length / 2)).toString("hex").slice(0, length)
}

