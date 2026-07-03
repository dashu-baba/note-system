import { verifyAccessToken } from "./jwt.js";
export async function requireAuth(c, next) {
    const header = c.req.header("Authorization");
    if (!header?.startsWith("Bearer ")) {
        return c.json({ error: { code: "unauthorized", message: "Missing or invalid Authorization header" } }, 401);
    }
    const token = header.slice("Bearer ".length);
    try {
        const payload = await verifyAccessToken(token);
        c.set("authUser", payload);
        await next();
    }
    catch {
        return c.json({ error: { code: "unauthorized", message: "Invalid or expired token" } }, 401);
    }
}
export function requireAdmin(c, next) {
    const user = c.get("authUser");
    if (user.type !== "system_user") {
        return c.json({ error: { code: "forbidden", message: "Admin access required" } }, 403);
    }
    return next();
}
