import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import bcrypt from "bcrypt";
import * as userService from "../services/user.service.js";
import { signAccessToken } from "../lib/jwt.js";
const loginSchema = z.object({
    email: z.email(),
    password: z.string().min(1),
});
const auth = new Hono();
auth.post("/login", zValidator("json", loginSchema, (result, c) => {
    if (!result.success) {
        const fields = {};
        for (const issue of result.error.issues) {
            fields[issue.path.join(".")] = issue.message;
        }
        return c.json({ error: { code: "validation_error", message: "Invalid request body", fields } }, 422);
    }
}), async (c) => {
    const { email, password } = c.req.valid("json");
    const invalidCredentials = () => c.json({ error: { code: "invalid_credentials", message: "Invalid email or password" } }, 401);
    const row = await userService.findByEmail(email);
    if (!row) {
        return invalidCredentials();
    }
    const passwordMatches = await bcrypt.compare(password, row.password);
    if (!passwordMatches) {
        return invalidCredentials();
    }
    const token = await signAccessToken(row.id, row.type);
    return c.json({
        token,
        user: {
            id: row.id,
            email: row.email,
            name: row.name,
            type: row.type,
        },
    });
});
export default auth;
