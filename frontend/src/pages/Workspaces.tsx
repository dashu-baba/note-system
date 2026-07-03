import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { apiRequest, ApiError } from '../lib/api'
import type { PaginatedResponse, Workspace } from '../types/api'

const PER_PAGE = 10

function Workspaces() {
  const { user, token, logout } = useAuth()

  const [page, setPage] = useState(1)
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadWorkspaces() {
      setIsLoading(true)
      setError(null)
      try {
        const result = await apiRequest<PaginatedResponse<Workspace>>('/workspaces', {
          token,
          query: { page, perPage: PER_PAGE },
        })
        if (!cancelled) {
          setWorkspaces(result.data)
          setTotal(result.meta.total)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'Failed to load workspaces.')
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    loadWorkspaces()
    return () => {
      cancelled = true
    }
  }, [page, token])

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE))

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
        <h1 className="text-xl font-semibold text-gray-900">Workspaces</h1>
        <div className="flex items-center gap-4">
          <Link to="/public/notes" className="text-sm font-medium text-gray-600 hover:text-gray-900">
            Public notes
          </Link>
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
        {isLoading && <p className="text-center text-sm text-gray-500">Loading workspaces…</p>}

        {error && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        {!isLoading && !error && workspaces.length === 0 && (
          <p className="text-center text-sm text-gray-500">No workspaces yet.</p>
        )}

        {!isLoading && !error && workspaces.length > 0 && (
          <ul className="flex flex-col gap-4">
            {workspaces.map((workspace) => (
              <li key={workspace.id}>
                <Link
                  to={`/workspaces/${workspace.id}/notes`}
                  className="block rounded-lg border border-gray-200 bg-white p-5 shadow-sm hover:border-gray-300"
                >
                  <h2 className="text-lg font-semibold text-gray-900">{workspace.name}</h2>
                  <p className="mt-2 text-sm text-gray-500">
                    Created {new Date(workspace.createdAt).toLocaleDateString()}
                  </p>
                </Link>
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

export default Workspaces
