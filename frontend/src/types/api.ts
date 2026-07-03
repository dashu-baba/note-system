export type UserType = 'system_user' | 'agency_user'

export type User = {
  id: string
  email: string
  name: string
  type: UserType
}

export type LoginResponse = {
  token: string
  user: User
}

export type Note = {
  id: string
  title: string
  content: string | null
  tags: unknown
  upvotes: number
  downvotes: number
  noteType: 'public' | 'private'
  createdAt: string
  updatedAt: string
  creatorId: string
  companyId: string
  workspaceId: string
}

export type Workspace = {
  id: string
  name: string
  companyId: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

export type HistoryEntry = {
  id: string
  content: string | null
  createdAt: string
  changedBy: {
    id: string
    name: string
  }
}

export type NoteHistoryResponse = PaginatedResponse<HistoryEntry> & {
  current: {
    content: string | null
  }
}

export type PaginationMeta = {
  page: number
  perPage: number
  total: number
}

export type PaginatedResponse<T> = {
  data: T[]
  meta: PaginationMeta
}

export type ApiErrorBody = {
  error: {
    code: string
    message: string
    fields?: Record<string, string>
  }
}
