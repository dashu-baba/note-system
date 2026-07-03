import { and, asc, count, desc, eq, ilike } from "drizzle-orm";
import { db } from "../db/index.js";
import { notes } from "../db/schema.js";
import { normalizePagination } from "../lib/pagination.js";
export const NOTE_SORT_FIELDS = ["upvotes", "downvotes", "createdAt"];
const sortColumns = {
    upvotes: notes.upvotes,
    downvotes: notes.downvotes,
    createdAt: notes.createdAt,
};
export async function findById(id) {
    const [row] = await db.select().from(notes).where(eq(notes.id, id)).limit(1);
    return row;
}
export async function listPublic(pagination) {
    const { page, perPage, offset } = normalizePagination(pagination);
    const [data, [{ total }]] = await Promise.all([
        db
            .select()
            .from(notes)
            .where(eq(notes.noteType, "public"))
            .limit(perPage)
            .offset(offset),
        db.select({ total: count() }).from(notes).where(eq(notes.noteType, "public")),
    ]);
    return { data, meta: { page, perPage, total } };
}
export async function listByWorkspaceId(workspaceId, pagination) {
    const { page, perPage, offset } = normalizePagination(pagination);
    const [data, [{ total }]] = await Promise.all([
        db
            .select()
            .from(notes)
            .where(eq(notes.workspaceId, workspaceId))
            .limit(perPage)
            .offset(offset),
        db.select({ total: count() }).from(notes).where(eq(notes.workspaceId, workspaceId)),
    ]);
    return { data, meta: { page, perPage, total } };
}
function buildOrderBy(params) {
    const column = sortColumns[params.sortBy ?? "createdAt"];
    return params.sortOrder === "asc" ? asc(column) : desc(column);
}
export async function listByCreatorId(creatorId, params) {
    const { page, perPage, offset } = normalizePagination(params);
    const where = params.title
        ? and(eq(notes.creatorId, creatorId), ilike(notes.title, `%${params.title}%`))
        : eq(notes.creatorId, creatorId);
    const orderBy = buildOrderBy(params);
    const [data, [{ total }]] = await Promise.all([
        db.select().from(notes).where(where).orderBy(orderBy).limit(perPage).offset(offset),
        db.select({ total: count() }).from(notes).where(where),
    ]);
    return { data, meta: { page, perPage, total } };
}
export async function listByCompanyId(companyId, params) {
    const { page, perPage, offset } = normalizePagination(params);
    const where = params.title
        ? and(eq(notes.companyId, companyId), ilike(notes.title, `%${params.title}%`))
        : eq(notes.companyId, companyId);
    const orderBy = buildOrderBy(params);
    const [data, [{ total }]] = await Promise.all([
        db.select().from(notes).where(where).orderBy(orderBy).limit(perPage).offset(offset),
        db.select({ total: count() }).from(notes).where(where),
    ]);
    return { data, meta: { page, perPage, total } };
}
export async function create(input) {
    const [row] = await db.insert(notes).values(input).returning();
    return row;
}
export async function update(id, patch) {
    const [row] = await db
        .update(notes)
        .set({ ...patch, updatedAt: new Date() })
        .where(eq(notes.id, id))
        .returning();
    return row;
}
export async function remove(id) {
    await db.delete(notes).where(eq(notes.id, id));
}
