import { count, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { user } from "../db/schema.js";
import { normalizePagination, type PaginationParams } from "../lib/pagination.js";

export type UserRow = typeof user.$inferSelect;
export type PublicUser = Omit<UserRow, "password">;

const publicColumns = {
    id: user.id,
    email: user.email,
    name: user.name,
    type: user.type,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
};

export async function findByEmail(email: string): Promise<UserRow | undefined> {
    const [row] = await db
        .select()
        .from(user)
        .where(eq(user.email, email.toLowerCase()))
        .limit(1);
    return row;
}

export async function findById(id: string): Promise<PublicUser | undefined> {
    const [row] = await db.select(publicColumns).from(user).where(eq(user.id, id)).limit(1);
    return row;
}

export async function list(pagination: PaginationParams) {
    const { page, perPage, offset } = normalizePagination(pagination);

    const [data, [{ total }]] = await Promise.all([
        db.select(publicColumns).from(user).limit(perPage).offset(offset),
        db.select({ total: count() }).from(user),
    ]);

    return { data, meta: { page, perPage, total } };
}

export type CreateUserInput = {
    id: string;
    email: string;
    passwordHash: string;
    name: string;
    type: UserRow["type"];
};

export async function create(input: CreateUserInput): Promise<PublicUser> {
    const [row] = await db
        .insert(user)
        .values({
            id: input.id,
            email: input.email.toLowerCase(),
            password: input.passwordHash,
            name: input.name,
            type: input.type,
        })
        .returning(publicColumns);
    return row;
}

export type UpdateUserInput = Partial<{
    email: string;
    passwordHash: string;
    name: string;
    type: UserRow["type"];
}>;

export async function update(id: string, patch: UpdateUserInput): Promise<PublicUser | undefined> {
    const { passwordHash, ...rest } = patch;
    const [row] = await db
        .update(user)
        .set({
            ...rest,
            ...(patch.email ? { email: patch.email.toLowerCase() } : {}),
            ...(passwordHash ? { password: passwordHash } : {}),
            updatedAt: new Date(),
        })
        .where(eq(user.id, id))
        .returning(publicColumns);
    return row;
}
