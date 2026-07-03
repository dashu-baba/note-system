import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { apiRequest, ApiError } from '../lib/api'
import type { Note, PaginatedResponse } from '../types/api'

const PER_PAGE = 10

function truncate(content: string | null, maxLength = 160) {
  if (!content) return ''
  return content.length > maxLength ? `${content.slice(0, maxLength)}…` : content
}

function WorkspaceNotes() {
  const { workspaceId } = useParams<{ workspaceId: string }>()
  const { user, token, logout } = useAuth()

  const [page, setPage] = useState(1)
  const [notes, setNotes] = useState<Note[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadNotes() {
      setIsLoading(true)
      setError(null)
      try {
        const result = await apiRequest<PaginatedResponse<Note>>(`/workspaces/${workspaceId}/notes`, {
          token,
          query: { page, perPage: PER_PAGE },
        })
        if (!cancelled) {
          setNotes(result.data)
          setTotal(result.meta.total)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'Failed to load notes.')
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    loadNotes()
    return () => {
      cancelled = true
    }
  }, [page, token, workspaceId])

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE))

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center gap-3">
          <Link to="/workspaces" className="text-sm font-medium text-gray-600 hover:text-gray-900">
            ← Back to workspaces
          </Link>
          <h1 className="text-xl font-semibold text-gray-900">Workspace Notes</h1>
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
        <div className="mb-6 flex justify-end">
          <Link
            to={`/workspaces/${workspaceId}/notes/new`}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            New note
          </Link>
        </div>

        {isLoading && <p className="text-center text-sm text-gray-500">Loading notes…</p>}

        {error && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        {!isLoading && !error && notes.length === 0 && (
          <p className="text-center text-sm text-gray-500">No notes in this workspace yet.</p>
        )}

        {!isLoading && !error && notes.length > 0 && (
          <ul className="flex flex-col gap-4">
            {notes.map((note) => (
              <li
                key={note.id}
                className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
              >
                <h2 className="text-lg font-semibold text-gray-900">{note.title}</h2>
                {note.content && (
                  <p className="mt-2 text-sm text-gray-600">{truncate(note.content)}</p>
                )}
                <div className="mt-3 flex items-center justify-between text-sm text-gray-500">
                  <div className="flex gap-4">
                    <span>▲ {note.upvotes}</span>
                    <span>▼ {note.downvotes}</span>
                  </div>
                  <div className="flex gap-4">
                    <Link
                      to={`/workspaces/${workspaceId}/notes/${note.id}/edit`}
                      state={{ note }}
                      className="font-medium text-gray-600 hover:text-gray-900"
                    >
                      Edit
                    </Link>
                    <Link
                      to={`/workspaces/${workspaceId}/notes/${note.id}/history`}
                      className="font-medium text-gray-600 hover:text-gray-900"
                    >
                      History
                    </Link>
                  </div>
                </div>
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

export default WorkspaceNotes
