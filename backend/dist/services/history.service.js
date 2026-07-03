import { count, desc } from "drizzle-orm";
import { db } from "../db/index.js";
import { history } from "../db/schema.js";
import { normalizePagination } from "../lib/pagination.js";
export async function list(pagination) {
    const { page, perPage, offset } = normalizePagination(pagination);
    const [data, [{ total }]] = await Promise.all([
        db.select().from(history).orderBy(desc(history.createdAt)).limit(perPage).offset(offset),
        db.select({ total: count() }).from(history),
    ]);
    return { data, meta: { page, perPage, total } };
}
export async function create(input) {
    const [row] = await db.insert(history).values(input).returning();
    return row;
}
