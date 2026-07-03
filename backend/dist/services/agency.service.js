import { count, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { agency } from "../db/schema.js";
import { normalizePagination } from "../lib/pagination.js";
export async function findById(id) {
    const [row] = await db.select().from(agency).where(eq(agency.id, id)).limit(1);
    return row;
}
export async function list(pagination) {
    const { page, perPage, offset } = normalizePagination(pagination);
    const [data, [{ total }]] = await Promise.all([
        db.select().from(agency).limit(perPage).offset(offset),
        db.select({ total: count() }).from(agency),
    ]);
    return { data, meta: { page, perPage, total } };
}
export async function create(input) {
    const [row] = await db.insert(agency).values(input).returning();
    return row;
}
export async function update(id, patch) {
    const [row] = await db
        .update(agency)
        .set({ ...patch, updatedAt: new Date() })
        .where(eq(agency.id, id))
        .returning();
    return row;
}
