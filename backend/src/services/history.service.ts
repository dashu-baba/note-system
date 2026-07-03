import { and, count, desc, eq, lt } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { db } from "../db/index.js";
import { history, notes, user } from "../db/schema.js";
import { normalizePagination, type PaginationParams } from "../lib/pagination.js";
import type { NoteRow } from "./notes.service.js";

export type HistoryRow = typeof history.$inferSelect;

const historyProjection = {
    id: history.id,
    content: history.content,
    createdAt: history.createdAt,
    changedBy: {
        id: history.changedBy,
        name: user.name,
    },
} as const;

export async function list(noteId: string, pagination: PaginationParams) {
    const { page, perPage, offset } = normalizePagination(pagination);
    const where = eq(history.noteId, noteId);

    const [data, [{ total }]] = await Promise.all([
        db
            .select(historyProjection)
            .from(history)
            .innerJoin(user, eq(history.changedBy, user.id))
            .where(where)
            .orderBy(desc(history.createdAt))
            .limit(perPage)
            .offset(offset),
        db.select({ total: count() }).from(history).where(where),
    ]);

    return { data, meta: { page, perPage, total } };
}

export type CreateHistoryInput = {
    id: string;
    noteId: string;
    changedBy: string;
    content: unknown;
};

export async function create(input: CreateHistoryInput): Promise<HistoryRow> {
    const [row] = await db.insert(history).values(input).returning();
    return row;
}

export async function deleteOlderThan(days: number): Promise<number> {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const deleted = await db.delete(history).where(lt(history.createdAt, cutoff)).returning({ id: history.id });
    return deleted.length;
}

export async function restore(noteId: string, historyId: string, changedBy: string): Promise<NoteRow | undefined> {
    return db.transaction(async (tx) => {
        const [entry] = await tx
            .select()
            .from(history)
            .where(and(eq(history.id, historyId), eq(history.noteId, noteId)))
            .limit(1);
        if (!entry) return undefined;

        const [existing] = await tx.select().from(notes).where(eq(notes.id, noteId)).limit(1);
        if (!existing) return undefined;

        if (existing.content !== entry.content) {
            await tx.insert(history).values({
                id: uuidv7(),
                noteId,
                changedBy,
                content: existing.content,
            });
        }

        const [row] = await tx
            .update(notes)
            .set({ content: entry.content as string | null, updatedAt: new Date() })
            .where(eq(notes.id, noteId))
            .returning();
        return row;
    });
}
