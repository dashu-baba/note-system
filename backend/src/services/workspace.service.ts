import { count, eq, inArray } from "drizzle-orm";
import { db } from "../db/index.js";
import { workspace } from "../db/schema.js";
import { normalizePagination, type PaginationParams } from "../lib/pagination.js";

export type WorkspaceRow = typeof workspace.$inferSelect;

export async function findById(id: string): Promise<WorkspaceRow | undefined> {
    const [row] = await db.select().from(workspace).where(eq(workspace.id, id)).limit(1);
    return row;
}

export async function listByCompanyId(companyId: string, pagination: PaginationParams) {
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

export async function listByCompanyIds(companyIds: string[], pagination: PaginationParams) {
    const { page, perPage, offset } = normalizePagination(pagination);

    if (companyIds.length === 0) {
        return { data: [], meta: { page, perPage, total: 0 } };
    }

    const [data, [{ total }]] = await Promise.all([
        db
            .select()
            .from(workspace)
            .where(inArray(workspace.companyId, companyIds))
            .limit(perPage)
            .offset(offset),
        db.select({ total: count() }).from(workspace).where(inArray(workspace.companyId, companyIds)),
    ]);

    return { data, meta: { page, perPage, total } };
}

export type CreateWorkspaceInput = {
    id: string;
    name: string;
    companyId: string;
    createdBy: string;
};

export async function create(input: CreateWorkspaceInput): Promise<WorkspaceRow> {
    const [row] = await db.insert(workspace).values(input).returning();
    return row;
}

export type UpdateWorkspaceInput = Partial<{
    name: string;
}>;

export async function update(id: string, patch: UpdateWorkspaceInput): Promise<WorkspaceRow | undefined> {
    const [row] = await db
        .update(workspace)
        .set({ ...patch, updatedAt: new Date() })
        .where(eq(workspace.id, id))
        .returning();
    return row;
}
