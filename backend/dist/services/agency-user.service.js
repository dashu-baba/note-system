import { and, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { agencyUser } from "../db/schema.js";
export async function listCompanyIdsByUserId(userId) {
    const rows = await db
        .select({ companyId: agencyUser.companyId })
        .from(agencyUser)
        .where(eq(agencyUser.userId, userId));
    return rows.map((row) => row.companyId);
}
export async function link(userId, companyId) {
    const [row] = await db.insert(agencyUser).values({ userId, companyId }).returning();
    return row;
}
export async function unlink(userId, companyId) {
    await db
        .delete(agencyUser)
        .where(and(eq(agencyUser.userId, userId), eq(agencyUser.companyId, companyId)));
}
