import type { Context, Next } from "hono";
import { verifyAccessToken, type JwtPayload } from "./jwt.js";

declare module "hono" {
    interface ContextVariableMap {
        authUser: JwtPayload;
    }
}

export async function requireAuth(c: Context, next: Next) {
    const header = c.req.header("Authorization");
    if (!header?.startsWith("Bearer ")) {
        return c.json({ error: { code: "unauthorized", message: "Missing or invalid Authorization header" } }, 401);
    }

    const token = header.slice("Bearer ".length);
    try {
        const payload = await verifyAccessToken(token);
        c.set("authUser", payload);
        await next();
    } catch {
        return c.json({ error: { code: "unauthorized", message: "Invalid or expired token" } }, 401);
    }
}

export function requireAdmin(c: Context, next: Next) {
    const user = c.get("authUser");
    if (user.type !== "system_user") {
        return c.json({ error: { code: "forbidden", message: "Admin access required" } }, 403);
    }
    return next();
}
