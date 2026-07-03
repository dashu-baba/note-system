import { sign, verify } from "hono/jwt";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN_SECONDS = Number(process.env.JWT_EXPIRES_IN_SECONDS ?? 900);

if (!JWT_SECRET) {
    throw new Error("JWT_SECRET environment variable is required");
}

export type JwtPayload = {
    sub: string;
    type: "system_user" | "agency_user";
    iat: number;
    exp: number;
};

export async function signAccessToken(userId: string, userType: JwtPayload["type"]): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const payload: JwtPayload = {
        sub: userId,
        type: userType,
        iat: now,
        exp: now + JWT_EXPIRES_IN_SECONDS,
    };
    return sign(payload, JWT_SECRET as string, "HS256");
}

export async function verifyAccessToken(token: string): Promise<JwtPayload> {
    return (await verify(token, JWT_SECRET as string, "HS256")) as JwtPayload;
}
