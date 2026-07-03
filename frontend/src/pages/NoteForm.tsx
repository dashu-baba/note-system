import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { apiRequest, ApiError } from '../lib/api'
import type { Note, NoteStatus, NoteType } from '../types/api'

type LocationState = { note?: Note } | null

function NoteForm() {
  const { workspaceId, noteId } = useParams<{ workspaceId: string; noteId?: string }>()
  const { token, user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const editingNote = (location.state as LocationState)?.note
  const isEditing = Boolean(noteId)

  const [title, setTitle] = useState(editingNote?.title ?? '')
  const [content, setContent] = useState(editingNote?.content ?? '')
  const [status, setStatus] = useState<NoteStatus>(editingNote?.status ?? 'draft')
  const [noteType, setNoteType] = useState<NoteType>('private')
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (isEditing && !editingNote) {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="mx-auto max-w-3xl px-4 py-8">
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            Note data wasn't provided. Please go back and open this note from the list.
          </p>
          <Link
            to={`/workspaces/${workspaceId}/notes`}
            className="mt-4 inline-block text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            ← Back to notes
          </Link>
        </main>
      </div>
    )
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setFieldErrors({})
    setIsSubmitting(true)
    try {
      if (isEditing) {
        await apiRequest<Note>(`/workspaces/${workspaceId}/notes/${noteId}`, {
          method: 'PATCH',
          token,
          body: { title, content, status },
        })
      } else {
        await apiRequest<Note>(`/workspaces/${workspaceId}/notes`, {
          method: 'POST',
          token,
          body: { title, content, status, noteType },
        })
      }
      navigate(`/workspaces/${workspaceId}/notes`)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
        setFieldErrors(err.fields ?? {})
      } else {
        setError('Something went wrong. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

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
          <h1 className="text-xl font-semibold text-gray-900">{isEditing ? 'Edit Note' : 'New Note'}</h1>
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
        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
        >
          <div className="mb-4">
            <label htmlFor="title" className="mb-1 block text-sm font-medium text-gray-700">
              Title
            </label>
            <input
              id="title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
            />
            {fieldErrors.title && <p className="mt-1 text-sm text-red-700">{fieldErrors.title}</p>}
          </div>

          <div className="mb-4">
            <label htmlFor="content" className="mb-1 block text-sm font-medium text-gray-700">
              Content
            </label>
            <textarea
              id="content"
              rows={8}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
            />
            {fieldErrors.content && <p className="mt-1 text-sm text-red-700">{fieldErrors.content}</p>}
          </div>

          <div className="mb-4 flex gap-4">
            <div className="flex-1">
              <label htmlFor="status" className="mb-1 block text-sm font-medium text-gray-700">
                Status
              </label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as NoteStatus)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
              {fieldErrors.status && <p className="mt-1 text-sm text-red-700">{fieldErrors.status}</p>}
            </div>

            {!isEditing && (
              <div className="flex-1">
                <label htmlFor="noteType" className="mb-1 block text-sm font-medium text-gray-700">
                  Visibility
                </label>
                <select
                  id="noteType"
                  value={noteType}
                  onChange={(e) => setNoteType(e.target.value as NoteType)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
                >
                  <option value="private">Private</option>
                  <option value="public">Public</option>
                </select>
              </div>
            )}
          </div>

          {error && (
            <p role="alert" className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-700 disabled:opacity-60"
          >
            {isSubmitting ? 'Saving…' : isEditing ? 'Save changes' : 'Create note'}
          </button>
        </form>
      </main>
    </div>
  )
}

export default NoteForm
