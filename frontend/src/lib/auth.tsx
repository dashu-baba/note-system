import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { apiRequest } from './api'
import type { LoginResponse, User } from '../types/api'

const STORAGE_KEY = 'note_system_auth'

type StoredAuth = {
  token: string
  user: User
}

function readStoredAuth(): StoredAuth | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as StoredAuth
  } catch {
    return null
  }
}

type AuthContextValue = {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<StoredAuth | null>(() => readStoredAuth())

  const login = async (email: string, password: string) => {
    const result = await apiRequest<LoginResponse>('/login', {
      method: 'POST',
      body: { email, password },
    })
    const nextAuth: StoredAuth = { token: result.token, user: result.user }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextAuth))
    setAuth(nextAuth)
  }

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY)
    setAuth(null)
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      user: auth?.user ?? null,
      token: auth?.token ?? null,
      isAuthenticated: auth !== null,
      login,
      logout,
    }),
    [auth],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
