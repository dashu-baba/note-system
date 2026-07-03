import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { v7 as uuidv7 } from "uuid";
import * as notesService from "../services/notes.service.js";
import * as workspaceService from "../services/workspace.service.js";
import * as agencyUserService from "../services/agency-user.service.js";
import * as historyService from "../services/history.service.js";
import { parseListParams } from "./notes.js";

const createNoteSchema = z.object({
    title: z.string().min(1),
    content: z.string().optional(),
    tags: z.unknown().optional(),
    status: z.enum(["draft", "published"]),
    noteType: z.enum(["public", "private"]).optional(),
});

const updateNoteSchema = z
    .object({
        title: z.string().min(1).optional(),
        content: z.string().optional(),
        tags: z.unknown().optional(),
        status: z.enum(["draft", "published"]).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, { message: "At least one field must be provided" });

const workspaces = new Hono();

workspaces.get("/", async (c) => {
    const page = Number(c.req.query("page") ?? undefined);
    const perPage = Number(c.req.query("perPage") ?? undefined);
    const authUser = c.get("authUser");

    const memberCompanyIds = await agencyUserService.listCompanyIdsByUserId(authUser.sub);
    const result = await workspaceService.listByCompanyIds(memberCompanyIds, {
        page: Number.isFinite(page) ? page : undefined,
        perPage: Number.isFinite(perPage) ? perPage : undefined,
    });

    return c.json(result);
});

workspaces.get("/:workspaceId/notes", async (c) => {
    const workspaceId = c.req.param("workspaceId")!;
    const authUser = c.get("authUser");

    const workspace = await workspaceService.findById(workspaceId);
    if (!workspace) {
        return c.json({ error: { code: "not_found", message: "Workspace not found" } }, 404);
    }

    const memberCompanyIds = await agencyUserService.listCompanyIdsByUserId(authUser.sub);
    if (!memberCompanyIds.includes(workspace.companyId)) {
        return c.json({ error: { code: "forbidden", message: "Not a member of this company" } }, 403);
    }

    const params = parseListParams(c);
    if ("error" in params) {
        return c.json({ error: { code: "validation_error", message: params.error } }, 422);
    }

    const result = await notesService.listByWorkspaceAndUserId(workspaceId, authUser.sub, params);
    return c.json(result);
});

workspaces.post("/:workspaceId/notes", zValidator("json", createNoteSchema, (result, c) => {
    if (!result.success) {
        const fields: Record<string, string> = {};
        for (const issue of result.error.issues) {
            fields[issue.path.join(".")] = issue.message;
        }
        return c.json({ error: { code: "validation_error", message: "Invalid request body", fields } }, 422);
    }
}), async (c) => {
    const workspaceId = c.req.param("workspaceId")!;
    const authUser = c.get("authUser");

    const workspace = await workspaceService.findById(workspaceId);
    if (!workspace) {
        return c.json({ error: { code: "not_found", message: "Workspace not found" } }, 404);
    }

    const memberCompanyIds = await agencyUserService.listCompanyIdsByUserId(authUser.sub);
    if (!memberCompanyIds.includes(workspace.companyId)) {
        return c.json({ error: { code: "forbidden", message: "Not a member of this company" } }, 403);
    }

    const body = c.req.valid("json");
    const created = await notesService.create({
        id: uuidv7(),
        title: body.title,
        content: body.content,
        tags: body.tags,
        noteType: body.noteType ?? "private",
        status: body.status,
        creatorId: authUser.sub,
        companyId: workspace.companyId,
        workspaceId: workspace.id,
    });

    const note = await notesService.findById(created.id);
    return c.json(note, 201);
});

workspaces.patch("/:workspaceId/notes/:noteId", zValidator("json", updateNoteSchema, (result, c) => {
    if (!result.success) {
        const fields: Record<string, string> = {};
        for (const issue of result.error.issues) {
            fields[issue.path.join(".")] = issue.message;
        }
        return c.json({ error: { code: "validation_error", message: "Invalid request body", fields } }, 422);
    }
}), async (c) => {
    const workspaceId = c.req.param("workspaceId")!;
    const noteId = c.req.param("noteId")!;
    const authUser = c.get("authUser");

    const existing = await notesService.findRawById(noteId);
    if (!existing || existing.workspaceId !== workspaceId) {
        return c.json({ error: { code: "not_found", message: "Note not found" } }, 404);
    }

    const memberCompanyIds = await agencyUserService.listCompanyIdsByUserId(authUser.sub);
    if (!memberCompanyIds.includes(existing.companyId)) {
        return c.json({ error: { code: "forbidden", message: "Not a member of this company" } }, 403);
    }

    const patch = c.req.valid("json");
    await notesService.update(noteId, patch, authUser.sub);

    const note = await notesService.findById(noteId);
    return c.json(note);
});

workspaces.post("/:workspaceId/notes/:noteId/upvote", async (c) => {
    const workspaceId = c.req.param("workspaceId")!;
    const noteId = c.req.param("noteId")!;
    const authUser = c.get("authUser");

    const existing = await notesService.findRawById(noteId);
    if (!existing || existing.workspaceId !== workspaceId) {
        return c.json({ error: { code: "not_found", message: "Note not found" } }, 404);
    }

    const memberCompanyIds = await agencyUserService.listCompanyIdsByUserId(authUser.sub);
    if (!memberCompanyIds.includes(existing.companyId)) {
        return c.json({ error: { code: "forbidden", message: "Not a member of this company" } }, 403);
    }

    const note = await notesService.vote(noteId, authUser.sub, "upvote");
    return c.json(note);
});

workspaces.post("/:workspaceId/notes/:noteId/downvote", async (c) => {
    const workspaceId = c.req.param("workspaceId")!;
    const noteId = c.req.param("noteId")!;
    const authUser = c.get("authUser");

    const existing = await notesService.findRawById(noteId);
    if (!existing || existing.workspaceId !== workspaceId) {
        return c.json({ error: { code: "not_found", message: "Note not found" } }, 404);
    }

    const memberCompanyIds = await agencyUserService.listCompanyIdsByUserId(authUser.sub);
    if (!memberCompanyIds.includes(existing.companyId)) {
        return c.json({ error: { code: "forbidden", message: "Not a member of this company" } }, 403);
    }

    const note = await notesService.vote(noteId, authUser.sub, "downvote");
    return c.json(note);
});

workspaces.get("/:workspaceId/notes/:noteId/history", async (c) => {
    const workspaceId = c.req.param("workspaceId")!;
    const noteId = c.req.param("noteId")!;
    const authUser = c.get("authUser");

    const existing = await notesService.findRawById(noteId);
    if (!existing || existing.workspaceId !== workspaceId) {
        return c.json({ error: { code: "not_found", message: "Note not found" } }, 404);
    }

    const memberCompanyIds = await agencyUserService.listCompanyIdsByUserId(authUser.sub);
    if (!memberCompanyIds.includes(existing.companyId)) {
        return c.json({ error: { code: "forbidden", message: "Not a member of this company" } }, 403);
    }

    const page = Number(c.req.query("page") ?? undefined);
    const perPage = Number(c.req.query("perPage") ?? undefined);
    const result = await historyService.list(noteId, {
        page: Number.isFinite(page) ? page : undefined,
        perPage: Number.isFinite(perPage) ? perPage : undefined,
    });

    return c.json({ current: { content: existing.content }, ...result });
});

workspaces.post("/:workspaceId/notes/:noteId/history/:historyId/restore", async (c) => {
    const workspaceId = c.req.param("workspaceId")!;
    const noteId = c.req.param("noteId")!;
    const historyId = c.req.param("historyId")!;
    const authUser = c.get("authUser");

    const existing = await notesService.findRawById(noteId);
    if (!existing || existing.workspaceId !== workspaceId) {
        return c.json({ error: { code: "not_found", message: "Note not found" } }, 404);
    }

    const memberCompanyIds = await agencyUserService.listCompanyIdsByUserId(authUser.sub);
    if (!memberCompanyIds.includes(existing.companyId)) {
        return c.json({ error: { code: "forbidden", message: "Not a member of this company" } }, 403);
    }

    const restored = await historyService.restore(noteId, historyId, authUser.sub);
    if (!restored) {
        return c.json({ error: { code: "not_found", message: "History entry not found" } }, 404);
    }

    const note = await notesService.findById(noteId);
    return c.json(note);
});

export default workspaces;
