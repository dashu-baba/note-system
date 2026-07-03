# Cron Jobs

Implemented with `node-cron`, registered directly in `backend/src/index.ts` at process startup (no separate worker process/queue).

## History retention purge

```ts
cron.schedule('0 0 * * *', async () => {
  const deleted = await deleteOlderThan(7)
  console.log(`Deleted ${deleted} history record(s) older than 7 days`)
})
```

| | |
|---|---|
| **Schedule** | `0 0 * * *` — daily at 00:00 server-local time |
| **Handler** | `deleteOlderThan(days)` in `backend/src/services/history.service.ts` |
| **Effect** | Hard-deletes rows from `history` where `created_at < now() - 7 days` |
| **Scope** | `history` table only (note content snapshots) — `workspace_history` is untouched (nothing writes to it, see db-design doc) |
| **Idempotent** | Yes — re-running with nothing older than 7 days deletes 0 rows |
| **Failure handling** | None — no retry, no alerting; an unhandled rejection would just be an unhandled promise rejection in the cron callback |
| **Logging** | `console.log` only, count of deleted rows |

## Known gaps
- Runs in-process with the API server — if multiple server instances run (e.g. horizontally scaled), the job fires once per instance, causing redundant (but harmless, since delete is idempotent) work. There's no leader-election or distributed lock.
- Retention window (7 days) is hardcoded, not configurable via env var.
- No cron job exists for anything else (no scheduled digest emails, no cleanup of orphaned data, no workspace_history purge since nothing writes to that table).
