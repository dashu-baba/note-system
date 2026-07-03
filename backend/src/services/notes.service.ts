import { and, asc, count, desc, eq, ilike, sql, type SQL } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { db } from "../db/index.js";
import { history, notes, notesVote, user } from "../db/schema.js";
import { normalizePagination, type PaginationParams } from "../lib/pagination.js";

const noteProjection = {
    id: notes.id,
    title: notes.title,
    content: notes.content,
    status: notes.status,
    createdByName: user.name,
    upvotes: notes.upvotes,
    downvotes: notes.downvotes
} as const;

export const NOTE_SORT_FIELDS = ["upvotes", "downvotes", "createdAt"] as const;
export type NoteSortField = (typeof NOTE_SORT_FIELDS)[number];
export type SortOrder = "asc" | "desc";

const sortColumns = {
    upvotes: notes.upvotes,
    downvotes: notes.downvotes,
    createdAt: notes.createdAt,
} as const;

export type NoteListParams = PaginationParams & {
    title?: string;
    sortBy?: NoteSortField;
    sortOrder?: SortOrder;
};

export type NoteRow = typeof notes.$inferSelect;

export async function findById(id: string) {
    const [row] = await db
        .select(noteProjection)
        .from(notes)
        .innerJoin(user, eq(notes.creatorId, user.id))
        .where(eq(notes.id, id))
        .limit(1);
    return row;
}

// Full row, for internal use (authorization checks, updates) where the projected
// client-facing shape from findById isn't enough (e.g. needs workspaceId/companyId).
export async function findRawById(id: string): Promise<NoteRow | undefined> {
    const [row] = await db.select().from(notes).where(eq(notes.id, id)).limit(1);
    return row;
}

export async function listPublic(params: NoteListParams) {
    const { page, perPage, offset } = normalizePagination(params);

    const where = params.title
        ? and(eq(notes.noteType, notes.noteType), ilike(notes.title, `%${params.title}%`))
        : eq(notes.noteType, notes.noteType);
    const orderBy = buildOrderBy(params);

    const [data, [{ total }]] = await Promise.all([
        db
            .select(noteProjection)
            .from(notes)
            .innerJoin(user, eq(notes.creatorId, user.id))
            .where(where)
            .orderBy(orderBy)
            .limit(perPage)
            .offset(offset),
        db.select({ total: count() }).from(notes).where(where),
    ]);

    return { data, meta: { page, perPage, total } };
}

export async function listByWorkspaceAndUserId(workspaceId: string, creatorId: string, params: NoteListParams) {
    const { page, perPage, offset } = normalizePagination(params);

    const where = params.title
        ? and(eq(notes.workspaceId, workspaceId), eq(notes.creatorId, creatorId), ilike(notes.title, `%${params.title}%`))
        : and(eq(notes.workspaceId, workspaceId), eq(notes.creatorId, creatorId));
    const orderBy = buildOrderBy(params);

    const [data, [{ total }]] = await Promise.all([
        db
            .select(noteProjection)
            .from(notes)
            .innerJoin(user, eq(notes.creatorId, user.id))
            .where(where)
            .orderBy(orderBy)
            .limit(perPage)
            .offset(offset),
        db.select({ total: count() }).from(notes).where(where),
    ]);

    return { data, meta: { page, perPage, total } };
}

function buildOrderBy(params: NoteListParams): SQL {
    const column = sortColumns[params.sortBy ?? "createdAt"];
    return params.sortOrder === "asc" ? asc(column) : desc(column);
}

export async function listByCreatorId(creatorId: string, params: NoteListParams) {
    const { page, perPage, offset } = normalizePagination(params);

    const where = params.title
        ? and(eq(notes.creatorId, creatorId), ilike(notes.title, `%${params.title}%`))
        : eq(notes.creatorId, creatorId);
    const orderBy = buildOrderBy(params);

    const [data, [{ total }]] = await Promise.all([
        db
            .select(noteProjection)
            .from(notes)
            .innerJoin(user, eq(notes.creatorId, user.id))
            .where(where)
            .orderBy(orderBy)
            .limit(perPage)
            .offset(offset),
        db.select({ total: count() }).from(notes).where(where),
    ]);

    return { data, meta: { page, perPage, total } };
}

export async function listByCompanyId(companyId: string, params: NoteListParams) {
    const { page, perPage, offset } = normalizePagination(params);

    const where = params.title
        ? and(eq(notes.companyId, companyId), ilike(notes.title, `%${params.title}%`))
        : eq(notes.companyId, companyId);
    const orderBy = buildOrderBy(params);

    const [data, [{ total }]] = await Promise.all([
        db
            .select(noteProjection)
            .from(notes)
            .innerJoin(user, eq(notes.creatorId, user.id))
            .where(where)
            .orderBy(orderBy)
            .limit(perPage)
            .offset(offset),
        db.select({ total: count() }).from(notes).where(where),
    ]);

    return { data, meta: { page, perPage, total } };
}

export type CreateNoteInput = {
    id: string;
    title: string;
    content?: string;
    tags?: unknown;
    noteType: NoteRow["noteType"];
    status: NoteRow["status"];
    creatorId: string;
    companyId: string;
    workspaceId: string;
};

export async function create(input: CreateNoteInput): Promise<NoteRow> {
    const [row] = await db.insert(notes).values(input).returning();
    return row;
}

export type UpdateNoteInput = Partial<{
    title: string;
    content: string;
    tags: unknown;
    noteType: NoteRow["noteType"];
    status: NoteRow["status"];
}>;

export async function update(id: string, patch: UpdateNoteInput, changedBy: string): Promise<NoteRow | undefined> {
    return db.transaction(async (tx) => {
        const [existing] = await tx.select().from(notes).where(eq(notes.id, id)).limit(1);
        if (!existing) return undefined;

        if (patch.content !== undefined && patch.content !== existing.content) {
            await tx.insert(history).values({
                id: uuidv7(),
                noteId: id,
                changedBy,
                content: existing.content,
            });
        }

        const [row] = await tx
            .update(notes)
            .set({ ...patch, updatedAt: new Date() })
            .where(eq(notes.id, id))
            .returning();
        return row;
    });
}

export async function remove(id: string): Promise<void> {
    await db.delete(notes).where(eq(notes.id, id));
}

export type VoteType = (typeof notesVote.$inferSelect)["voteType"];

// Casting a vote is a toggle: voting again with the same type retracts it,
// voting with the other type switches it, and adjusts the note's counters accordingly.
export async function vote(noteId: string, userId: string, voteType: VoteType): Promise<NoteRow | undefined> {
    return db.transaction(async (tx) => {
        const [existingNote] = await tx.select().from(notes).where(eq(notes.id, noteId)).limit(1);
        if (!existingNote) return undefined;

        const voteWhere = and(eq(notesVote.noteId, noteId), eq(notesVote.userId, userId));
        const [existingVote] = await tx.select().from(notesVote).where(voteWhere).limit(1);

        let upvoteDelta = 0;
        let downvoteDelta = 0;

        if (!existingVote) {
            await tx.insert(notesVote).values({ userId, noteId, voteType });
            if (voteType === "upvote") upvoteDelta = 1;
            else downvoteDelta = 1;
        } else if (existingVote.voteType === voteType) {
            await tx.delete(notesVote).where(voteWhere);
            if (voteType === "upvote") upvoteDelta = -1;
            else downvoteDelta = -1;
        } else {
            await tx.update(notesVote).set({ voteType }).where(voteWhere);
            if (voteType === "upvote") {
                upvoteDelta = 1;
                downvoteDelta = -1;
            } else {
                upvoteDelta = -1;
                downvoteDelta = 1;
            }
        }

        const [row] = await tx
            .update(notes)
            .set({
                upvotes: sql`greatest(${notes.upvotes} + ${upvoteDelta}, 0)`,
                downvotes: sql`greatest(${notes.downvotes} + ${downvoteDelta}, 0)`,
            })
            .where(eq(notes.id, noteId))
            .returning();
        return row;
    });
}
