import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { apiRequest, ApiError } from '../lib/api'
import type { HistoryEntry, NoteHistoryResponse } from '../types/api'

const PER_PAGE = 10

function truncate(content: string | null, maxLength = 200) {
  if (!content) return ''
  return content.length > maxLength ? `${content.slice(0, maxLength)}…` : content
}

function formatDate(value: string) {
  return new Date(value).toLocaleString()
}

function NoteHistory() {
  const { workspaceId, noteId } = useParams<{ workspaceId: string; noteId: string }>()
  const { user, token, logout } = useAuth()

  const [page, setPage] = useState(1)
  const [entries, setEntries] = useState<HistoryEntry[]>([])
  const [currentContent, setCurrentContent] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [restoringId, setRestoringId] = useState<string | null>(null)
  const [restoreError, setRestoreError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadHistory() {
      setIsLoading(true)
      setError(null)
      try {
        const result = await apiRequest<NoteHistoryResponse>(
          `/workspaces/${workspaceId}/notes/${noteId}/history`,
          {
            token,
            query: { page, perPage: PER_PAGE },
          },
        )
        if (!cancelled) {
          setEntries(result.data)
          setTotal(result.meta.total)
          setCurrentContent(result.current.content)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'Failed to load history.')
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    loadHistory()
    return () => {
      cancelled = true
    }
  }, [page, token, workspaceId, noteId])

  async function handleRestore(historyId: string) {
    setRestoringId(historyId)
    setRestoreError(null)
    try {
      await apiRequest(`/workspaces/${workspaceId}/notes/${noteId}/history/${historyId}/restore`, {
        method: 'POST',
        token,
      })
      setPage(1)
      const result = await apiRequest<NoteHistoryResponse>(
        `/workspaces/${workspaceId}/notes/${noteId}/history`,
        {
          token,
          query: { page: 1, perPage: PER_PAGE },
        },
      )
      setEntries(result.data)
      setTotal(result.meta.total)
      setCurrentContent(result.current.content)
    } catch (err) {
      setRestoreError(err instanceof ApiError ? err.message : 'Failed to restore this version.')
    } finally {
      setRestoringId(null)
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE))

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center gap-3">
          <Link
            to={`/workspaces/${workspaceId}/notes`}
            className="text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            ← Back to notes
          </Link>
          <h1 className="text-xl font-semibold text-gray-900">Note History</h1>
        </div>
        <div className="flex items-center gap-4">
          {user && <span className="text-sm text-gray-600">{user.name}</span>}
          <button
            type="button"
            onClick={logout}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            Log out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        {isLoading && <p className="text-center text-sm text-gray-500">Loading history…</p>}

        {error && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        {restoreError && (
          <p role="alert" className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {restoreError}
          </p>
        )}

        {!isLoading && !error && (
          <section className="mb-6 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Current version</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">
              {currentContent ? truncate(currentContent) : 'No content.'}
            </p>
          </section>
        )}

        {!isLoading && !error && entries.length === 0 && (
          <p className="text-center text-sm text-gray-500">No previous versions yet.</p>
        )}

        {!isLoading && !error && entries.length > 0 && (
          <ul className="flex flex-col gap-4">
            {entries.map((entry) => (
              <li key={entry.id} className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    <span className="font-medium text-gray-900">{entry.changedBy.name}</span>
                    {' · '}
                    {formatDate(entry.createdAt)}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRestore(entry.id)}
                    disabled={restoringId === entry.id}
                    className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-40"
                  >
                    {restoringId === entry.id ? 'Restoring…' : 'Restore'}
                  </button>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm text-gray-700">
                  {entry.content ? truncate(entry.content) : 'No content.'}
                </p>
              </li>
            ))}
          </ul>
        )}

        {!isLoading && !error && total > 0 && (
          <div className="mt-6 flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 disabled:opacity-40"
            >
              Prev
            </button>
            <span className="text-sm text-gray-600">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </main>
    </div>
  )
}

export default NoteHistory
