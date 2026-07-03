import { Navigate, Route, Routes } from 'react-router-dom'
import Login from './pages/Login'
import Notes from './pages/Notes'
import Workspaces from './pages/Workspaces'
import WorkspaceNotes from './pages/WorkspaceNotes'
import NoteHistory from './pages/NoteHistory'
import { ProtectedRoute } from './routes/ProtectedRoute'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/public/notes"
        element={
          <ProtectedRoute>
            <Notes />
          </ProtectedRoute>
        }
      />
      <Route
        path="/workspaces"
        element={
          <ProtectedRoute>
            <Workspaces />
          </ProtectedRoute>
        }
      />
      <Route
        path="/workspaces/:workspaceId/notes"
        element={
          <ProtectedRoute>
            <WorkspaceNotes />
          </ProtectedRoute>
        }
      />
      <Route
        path="/workspaces/:workspaceId/notes/:noteId/history"
        element={
          <ProtectedRoute>
            <NoteHistory />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default App
