import { count, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { agency } from "../db/schema.js";
import { normalizePagination, type PaginationParams } from "../lib/pagination.js";

export type AgencyRow = typeof agency.$inferSelect;

export async function findById(id: string): Promise<AgencyRow | undefined> {
    const [row] = await db.select().from(agency).where(eq(agency.id, id)).limit(1);
    return row;
}

export async function list(pagination: PaginationParams) {
    const { page, perPage, offset } = normalizePagination(pagination);

    const [data, [{ total }]] = await Promise.all([
        db.select().from(agency).limit(perPage).offset(offset),
        db.select({ total: count() }).from(agency),
    ]);

    return { data, meta: { page, perPage, total } };
}

export type CreateAgencyInput = {
    id: string;
    companyName: string;
};

export async function create(input: CreateAgencyInput): Promise<AgencyRow> {
    const [row] = await db.insert(agency).values(input).returning();
    return row;
}

export type UpdateAgencyInput = Partial<{
    companyName: string;
}>;

export async function update(id: string, patch: UpdateAgencyInput): Promise<AgencyRow | undefined> {
    const [row] = await db
        .update(agency)
        .set({ ...patch, updatedAt: new Date() })
        .where(eq(agency.id, id))
        .returning();
    return row;
}
