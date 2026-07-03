import { count, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { workspace } from "../db/schema.js";
import { normalizePagination } from "../lib/pagination.js";
export async function findById(id) {
    const [row] = await db.select().from(workspace).where(eq(workspace.id, id)).limit(1);
    return row;
}
export async function listByCompanyId(companyId, pagination) {
    const { page, perPage, offset } = normalizePagination(pagination);
    const [data, [{ total }]] = await Promise.all([
        db
            .select()
            .from(workspace)
            .where(eq(workspace.companyId, companyId))
            .limit(perPage)
            .offset(offset),
        db.select({ total: count() }).from(workspace).where(eq(workspace.companyId, companyId)),
    ]);
    return { data, meta: { page, perPage, total } };
}
export async function create(input) {
    const [row] = await db.insert(workspace).values(input).returning();
    return row;
}
export async function update(id, patch) {
    const [row] = await db
        .update(workspace)
        .set({ ...patch, updatedAt: new Date() })
        .where(eq(workspace.id, id))
        .returning();
    return row;
}
