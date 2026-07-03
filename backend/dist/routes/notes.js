import { Hono } from "hono";
import * as agencyUserService from "../services/agency-user.service.js";
import * as notesService from "../services/notes.service.js";
import { NOTE_SORT_FIELDS } from "../services/notes.service.js";
const notes = new Hono();
function parseListParams(c) {
    const page = Number(c.req.query("page") ?? undefined);
    const perPage = Number(c.req.query("perPage") ?? undefined);
    const title = c.req.query("title") || undefined;
    const sortByRaw = c.req.query("sortBy");
    if (sortByRaw !== undefined && !NOTE_SORT_FIELDS.includes(sortByRaw)) {
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
        sortBy: sortByRaw,
        sortOrder: sortOrderRaw,
    };
}
notes.get("/public", async (c) => {
    const page = Number(c.req.query("page") ?? undefined);
    const perPage = Number(c.req.query("perPage") ?? undefined);
    const result = await notesService.listPublic({
        page: Number.isFinite(page) ? page : undefined,
        perPage: Number.isFinite(perPage) ? perPage : undefined,
    });
    return c.json(result);
});
notes.get("/me", async (c) => {
    const params = parseListParams(c);
    if ("error" in params) {
        return c.json({ error: { code: "validation_error", message: params.error } }, 422);
    }
    const authUser = c.get("authUser");
    const result = await notesService.listByCreatorId(authUser.sub, params);
    return c.json(result);
});
notes.get("/company/:companyId", async (c) => {
    const params = parseListParams(c);
    if ("error" in params) {
        return c.json({ error: { code: "validation_error", message: params.error } }, 422);
    }
    const companyId = c.req.param("companyId");
    const authUser = c.get("authUser");
    const memberCompanyIds = await agencyUserService.listCompanyIdsByUserId(authUser.sub);
    if (!memberCompanyIds.includes(companyId)) {
        return c.json({ error: { code: "forbidden", message: "Not a member of this company" } }, 403);
    }
    const result = await notesService.listByCompanyId(companyId, params);
    return c.json(result);
});
export default notes;
