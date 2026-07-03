import { pgTable, pgEnum, uuid, varchar, text, integer, timestamp, jsonb, primaryKey, index, uniqueIndex, } from "drizzle-orm/pg-core";
export const userTypeEnum = pgEnum("user_type", ["system_user", "agency_user"]);
export const noteTypeEnum = pgEnum("note_type", ["public", "private"]);
export const statusEnum = pgEnum("status", ["draft", "published"]);
export const user = pgTable("user", {
    id: uuid("id").primaryKey(),
    email: varchar("email").notNull().unique(),
    password: varchar("password").notNull(),
    name: varchar("name").notNull(),
    type: userTypeEnum("type").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
    index("idx_user_email").on(table.email),
    index("idx_user_name").on(table.name),
]);
export const agency = pgTable("agency", {
    id: uuid("id").primaryKey(),
    companyName: varchar("company_name").notNull().unique(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
    index("idx_agency_company_name").on(table.companyName),
]);
export const agencyUser = pgTable("agency_user", {
    userId: uuid("user_id")
        .notNull()
        .references(() => user.id),
    companyId: uuid("company_id")
        .notNull()
        .references(() => agency.id),
}, (table) => [
    primaryKey({ columns: [table.userId, table.companyId] }),
]);
export const workspace = pgTable("workspace", {
    id: uuid("id").primaryKey(),
    name: varchar("name").notNull(),
    companyId: uuid("company_id")
        .notNull()
        .references(() => agency.id),
    createdBy: uuid("created_by")
        .notNull()
        .references(() => user.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
    uniqueIndex("workspace_name_company_id_unique").on(table.name, table.companyId),
    index("idx_workspace_name").on(table.name),
    index("idx_workspace_name_created_by").on(table.name, table.createdBy),
]);
export const notes = pgTable("notes", {
    id: uuid("id").primaryKey(),
    title: varchar("title").notNull(),
    content: text("content"),
    tags: jsonb("tags"),
    upvotes: integer("upvotes").notNull().default(0),
    downvotes: integer("downvotes").notNull().default(0),
    noteType: noteTypeEnum("note_type").notNull(),
    status: statusEnum("status").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    creatorId: uuid("creator_id")
        .notNull()
        .references(() => user.id),
    companyId: uuid("company_id")
        .notNull()
        .references(() => agency.id),
    workspaceId: uuid("workspace_id")
        .notNull()
        .references(() => workspace.id),
}, (table) => [
    index("idx_notes_creator_id_upvotes_downvotes_created_at").on(table.creatorId, table.upvotes, table.downvotes, table.createdAt),
    index("idx_notes_creator_id_title_upvotes_downvotes_created_at").on(table.creatorId, table.title, table.upvotes, table.downvotes, table.createdAt),
    index("idx_notes_company_id_title_upvotes_downvotes_created_at").on(table.companyId, table.title, table.upvotes, table.downvotes, table.createdAt),
    index("idx_notes_company_id_upvotes_downvotes_created_at").on(table.companyId, table.upvotes, table.downvotes, table.createdAt),
    index("idx_notes_status_upvotes_downvotes_created_at").on(table.status, table.upvotes, table.downvotes, table.createdAt),
]);
export const history = pgTable("history", {
    id: uuid("id").primaryKey(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    changedBy: uuid("changed_by")
        .notNull()
        .references(() => user.id),
    content: jsonb("content").notNull(),
});
export const notesVote = pgTable("notes_vote", {
    userId: uuid("user_id")
        .notNull()
        .references(() => user.id),
    noteId: uuid("note_id")
        .notNull()
        .references(() => notes.id),
}, (table) => [
    primaryKey({ columns: [table.userId, table.noteId] }),
]);
