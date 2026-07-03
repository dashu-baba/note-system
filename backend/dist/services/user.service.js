import { count, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { user } from "../db/schema.js";
import { normalizePagination } from "../lib/pagination.js";
const publicColumns = {
    id: user.id,
    email: user.email,
    name: user.name,
    type: user.type,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
};
export async function findByEmail(email) {
    const [row] = await db
        .select()
        .from(user)
        .where(eq(user.email, email.toLowerCase()))
        .limit(1);
    return row;
}
export async function findById(id) {
    const [row] = await db.select(publicColumns).from(user).where(eq(user.id, id)).limit(1);
    return row;
}
export async function list(pagination) {
    const { page, perPage, offset } = normalizePagination(pagination);
    const [data, [{ total }]] = await Promise.all([
        db.select(publicColumns).from(user).limit(perPage).offset(offset),
        db.select({ total: count() }).from(user),
    ]);
    return { data, meta: { page, perPage, total } };
}
export async function create(input) {
    const [row] = await db
        .insert(user)
        .values({
        id: input.id,
        email: input.email.toLowerCase(),
        password: input.passwordHash,
        name: input.name,
        type: input.type,
    })
        .returning(publicColumns);
    return row;
}
export async function update(id, patch) {
    const { passwordHash, ...rest } = patch;
    const [row] = await db
        .update(user)
        .set({
        ...rest,
        ...(patch.email ? { email: patch.email.toLowerCase() } : {}),
        ...(passwordHash ? { password: passwordHash } : {}),
        updatedAt: new Date(),
    })
        .where(eq(user.id, id))
        .returning(publicColumns);
    return row;
}
