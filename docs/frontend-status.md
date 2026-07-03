# Frontend Status

React + Vite + React Router. Routes in `frontend/src/App.tsx`, API client in `frontend/src/lib/api.ts`, types in `frontend/src/types/api.ts`.

## Routes

| Path | Page | Auth |
|---|---|---|
| `/login` | `Login.tsx` | public |
| `/public/notes` | `Notes.tsx` | protected |
| `/workspaces` | `Workspaces.tsx` | protected |
| `/workspaces/:workspaceId/notes` | `WorkspaceNotes.tsx` | protected |
| `/workspaces/:workspaceId/notes/:noteId/history` | `NoteHistory.tsx` | protected |
| `*` | redirect → `/login` | — |

`ProtectedRoute` gates on a JWT held in `lib/auth.tsx`.

## Implemented

- **Login** — email/password form, calls `POST /login`, stores token, redirects to `/workspaces`.
- **Public notes list** (`Notes.tsx`) — paginated read-only list from `GET /public/notes`, shows title/content excerpt/upvote-downvote counts. No sort/filter/title-search UI even though the API supports it.
- **Workspaces list** (`Workspaces.tsx`) — paginated list from `GET /workspaces`, links into each workspace's notes. No "create workspace" UI (and no route for it — see api-design doc gap).
- **Workspace notes list** (`WorkspaceNotes.tsx`) — paginated list from `GET /workspaces/:id/notes`, shows upvote/downvote counts (display only, not clickable) and a link to each note's history page.
- **Note history + restore** (`NoteHistory.tsx`) — **implemented and working**: fetches `GET .../history`, renders current content plus paginated past versions with author/timestamp, and each entry has a "Restore" button wired to `POST .../history/:historyId/restore`. On restore success it reloads page 1 of history and the current content. Has its own loading/error state for the restore action.

## Missing

- **Create note** — no form/modal/page anywhere in the frontend calls `POST /workspaces/:workspaceId/notes`. `WorkspaceNotes.tsx` only lists notes; there's no "New note" button or route.
- **Edit note** — no form/page calls `PATCH /workspaces/:workspaceId/notes/:noteId`. Note titles/content are rendered read-only in `WorkspaceNotes.tsx`; there's no edit UI, and no note-detail page to navigate to at all — clicking a note in the list does nothing (only the "History" link is clickable).
- **Upvote/downvote interaction** — counts are displayed but not clickable; `POST .../upvote` and `POST .../downvote` exist in the backend but nothing in the frontend calls them.
- **Public notes filtering** — no toggle for the fact that `GET /public/notes` currently returns all notes, not just public/published ones (see api-design doc — likely a backend bug, but also nothing in the UI would surface note type/status anyway).
- **Workspace create/rename** — no UI, and no backend route either (see api-design doc).
- **Logout** — present as a button in every page header, functional.

## Priority gap for "so far implemented" ask

Restore history is done end-to-end (backend + frontend). Create and edit note are the two biggest missing pieces — the backend endpoints exist and are tested (`POST`/`PATCH` on `/workspaces/:workspaceId/notes(/:noteId)`), but there is currently no frontend entry point to reach them at all.
