import { and, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { agencyUser } from "../db/schema.js";

export type AgencyUserRow = typeof agencyUser.$inferSelect;

export async function listCompanyIdsByUserId(userId: string): Promise<string[]> {
    const rows = await db
        .select({ companyId: agencyUser.companyId })
        .from(agencyUser)
        .where(eq(agencyUser.userId, userId));
    return rows.map((row) => row.companyId);
}

export async function link(userId: string, companyId: string): Promise<AgencyUserRow> {
    const [row] = await db.insert(agencyUser).values({ userId, companyId }).returning();
    return row;
}

export async function unlink(userId: string, companyId: string): Promise<void> {
    await db
        .delete(agencyUser)
        .where(and(eq(agencyUser.userId, userId), eq(agencyUser.companyId, companyId)));
}
