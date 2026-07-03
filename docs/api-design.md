# API Design

Base URL: `http://localhost:3000/api/v1` (Hono server, `backend/src/index.ts`).

All routes except `POST /login` require `Authorization: Bearer <jwt>`. Middleware order: `logger` → `secureHeaders` → `cors` → `csrf` → `bodyLimit(50kb)` → `requireAuth` (skipped only for `/api/v1/login`).

## Error shape

All errors follow:
```json
{ "error": { "code": "string", "message": "string", "fields": { "field": "message" } } }
```
`fields` is only present on `validation_error` (422). Common codes: `validation_error` (422), `unauthorized` (401), `invalid_credentials` (401), `forbidden` (403), `not_found` (404).

## Pagination

List endpoints accept `?page=<n>&perPage=<n>` (default `page=1`, `perPage=20`) and return:
```json
{ "data": [...], "meta": { "page": 1, "perPage": 20, "total": 42 } }
```

---

## Auth

### `POST /api/v1/login`
No auth required.

**Request**
```json
{ "email": "user@example.com", "password": "secret" }
```

**Response `200`**
```json
{
  "token": "eyJ...",
  "user": { "id": "uuid", "email": "user@example.com", "name": "Jane", "type": "agency_user" }
}
```

**Response `401`** — `invalid_credentials`.

---

## Public Notes

### `GET /api/v1/public/notes`
Lists notes (currently: **all notes regardless of `noteType`/`status`** — filtering by `note_type = 'public'` and `status = 'published'` is not applied in `notesService.listPublic`; this looks like a bug, not by design).

**Query params**: `page`, `perPage`, `title` (partial match), `sortBy` (`upvotes` \| `downvotes` \| `createdAt`, default `createdAt`), `sortOrder` (`asc` \| `desc`, default `desc`).

**Response `200`**
```json
{
  "data": [
    {
      "id": "uuid", "title": "...", "content": "...", "status": "published",
      "createdByName": "Jane", "upvotes": 3, "downvotes": 0
    }
  ],
  "meta": { "page": 1, "perPage": 20, "total": 1 }
}
```

---

## Workspaces

### `GET /api/v1/workspaces`
Lists workspaces belonging to any agency the authenticated user is a member of.

**Query params**: `page`, `perPage`.

**Response `200`**
```json
{
  "data": [
    { "id": "uuid", "name": "Team A", "companyId": "uuid", "createdBy": "uuid", "createdAt": "...", "updatedAt": "..." }
  ],
  "meta": { "page": 1, "perPage": 20, "total": 1 }
}
```

> No `POST /workspaces` (create) or `PATCH /workspaces/:id` (rename) route exists, even though `workspace.service.ts` has `create`/`update` functions — the routes just aren't wired up.

---

## Notes (within a workspace)

All routes below require the caller to be a member of the workspace's owning agency (403 `forbidden` otherwise), and the note/workspace pair must exist (404 `not_found` otherwise).

### `GET /api/v1/workspaces/:workspaceId/notes`
Lists notes in the workspace **created by the current user** (`listByWorkspaceAndUserId` filters on `workspaceId + creatorId` — not all notes in the workspace, just the caller's own).

**Query params**: `page`, `perPage`, `title`, `sortBy`, `sortOrder` (same as public notes).

**Response `200`**: same shape as public notes list.

### `POST /api/v1/workspaces/:workspaceId/notes`
Create a note.

**Request**
```json
{
  "title": "My note",
  "content": "optional body text",
  "tags": ["any", "json", "value"],
  "status": "draft",
  "noteType": "private"
}
```
- `title`: required, non-empty.
- `content`, `tags`, `noteType`: optional (`noteType` defaults to `"private"`).
- `status`: required, `"draft"` \| `"published"`.

**Response `201`** — full note object:
```json
{
  "id": "uuid", "title": "...", "content": "...", "status": "draft",
  "createdByName": "Jane", "upvotes": 0, "downvotes": 0
}
```

**Response `422`** — validation_error with `fields`.

### `PATCH /api/v1/workspaces/:workspaceId/notes/:noteId`
Update a note. Partial — at least one field required.

**Request** (all optional, ≥1 required)
```json
{ "title": "New title", "content": "New body", "tags": [...], "status": "published" }
```
Note: `noteType` is **not** updatable via this endpoint (schema omits it).

If `content` changes, the previous content is snapshotted into `history` before the update is applied (single transaction).

**Response `200`** — updated note object. **Response `404`** if note doesn't belong to `:workspaceId`.

### `POST /api/v1/workspaces/:workspaceId/notes/:noteId/upvote`
Toggling upvote for the current user. No request body.

**Response `200`** — full note row (including counters) after the vote is applied.

### `POST /api/v1/workspaces/:workspaceId/notes/:noteId/downvote`
Same as upvote, opposite direction.

**Vote semantics** (both endpoints): casting the same vote type again retracts it; casting the other type flips it; counters (`upvotes`/`downvotes`) are updated atomically in the same transaction, floored at 0.

---

## Note History

### `GET /api/v1/workspaces/:workspaceId/notes/:noteId/history`
**Query params**: `page`, `perPage`.

**Response `200`**
```json
{
  "current": { "content": "current note content" },
  "data": [
    {
      "id": "uuid",
      "content": "previous content snapshot",
      "createdAt": "2026-06-20T12:00:00.000Z",
      "changedBy": { "id": "uuid", "name": "Jane" }
    }
  ],
  "meta": { "page": 1, "perPage": 20, "total": 5 }
}
```
Ordered newest-first (`created_at desc`).

### `POST /api/v1/workspaces/:workspaceId/notes/:noteId/history/:historyId/restore`
Restores the note's `content` to the given history entry's snapshot. Before restoring, the *current* content is itself snapshotted into `history` (so restoring is non-destructive and undoable). No request body.

**Response `200`** — the note object with restored content.
**Response `404`** — `not_found` if the history entry doesn't belong to the note.

---

## Endpoints not yet built (referenced by schema/services but no route)
- `POST /workspaces` — create workspace (`workspace.service.create` exists, unused).
- `PATCH /workspaces/:id` — rename workspace (`workspace.service.update` exists, unused).
- `DELETE .../notes/:noteId` — `notes.service.remove` exists, unused.
- Anything for `workspace_history` (no service functions exist for it either).
