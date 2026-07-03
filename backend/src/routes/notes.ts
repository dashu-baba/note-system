import { Hono, type Context } from "hono";
import * as agencyUserService from "../services/agency-user.service.js";
import * as notesService from "../services/notes.service.js";
import { NOTE_SORT_FIELDS, type NoteListParams } from "../services/notes.service.js";

const notes = new Hono();

export function parseListParams(c: Context): NoteListParams | { error: string } {
    const page = Number(c.req.query("page") ?? undefined);
    const perPage = Number(c.req.query("perPage") ?? undefined);
    const title = c.req.query("title") || undefined;

    const sortByRaw = c.req.query("sortBy");
    if (sortByRaw !== undefined && !NOTE_SORT_FIELDS.includes(sortByRaw as never)) {
        return { error: `sortBy must be one of: ${NOTE_SORT_FIELDS.join(", ")}` };
    }

    const sortOrderRaw = c.req.query("sortOrder");
    if (sortOrderRaw !== undefined && sortOrderRaw !== "asc" && sortOrderRaw !== "desc") {
        return { error: "sortOrder must be one of: asc, desc" };
    }

    return {
        page: Number.isFinite(page) ? page : undefined,
        perPage: Number.isFinite(perPage) ? perPage : undefined,
        title,
        sortBy: sortByRaw as NoteListParams["sortBy"],
        sortOrder: sortOrderRaw as NoteListParams["sortOrder"],
    };
}

notes.get("/notes", async (c) => {
    const params = parseListParams(c);
        if ("error" in params) {
        return c.json({ error: { code: "validation_error", message: params.error } }, 422);
    }

    const result = await notesService.listPublic(params);

    return c.json(result);
});

export default notes;
