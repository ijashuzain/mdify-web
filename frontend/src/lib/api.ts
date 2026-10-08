export type Doc = {
  id: string
  title: string
  content?: string
  created_at: string
  updated_at: string
  expires_at: string
  has_passcode: boolean
  unlisted: boolean
  views: number
  can_edit: boolean
  edit_token?: string
}

export type User = { email: string; doc_count: number; max_docs: number; max_days: number }

export type Expiry = '1d' | '7d' | '30d' | '90d'

export class ApiError extends Error {
  status: number
  code?: string
  constructor(status: number, message: string, code?: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

const TOKEN_KEY = 'mdify:token'
const ANON_KEY = 'mdify:anon'
const OWNED_KEY = 'mdify:owned'

export function storageGet(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function storageSet(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    /* storage unavailable */
  }
}

export const getToken = () => storageGet(TOKEN_KEY)
export const setToken = (t: string | null) => storageSet(TOKEN_KEY, t)

export function anonId(): string {
  let id = storageGet(ANON_KEY)
  if (!id) {
    id = crypto.randomUUID()
    storageSet(ANON_KEY, id)
  }
  return id
}

/** Guest documents created in this browser, with the secret token that allows editing them. */
export type OwnedDoc = { id: string; edit_token: string; title: string; expires_at: string }

export function ownedDocs(): OwnedDoc[] {
  try {
    const list = JSON.parse(storageGet(OWNED_KEY) || '[]') as OwnedDoc[]
    return list.filter((d) => new Date(d.expires_at).getTime() > Date.now())
  } catch {
    return []
  }
}

export function saveOwned(list: OwnedDoc[]) {
  storageSet(OWNED_KEY, JSON.stringify(list))
}

export function rememberOwned(doc: Doc, editToken?: string) {
  const list = ownedDocs()
  const token = editToken || list.find((d) => d.id === doc.id)?.edit_token
  if (!token) return
  const entry = { id: doc.id, edit_token: token, title: doc.title, expires_at: doc.expires_at }
  saveOwned([entry, ...list.filter((d) => d.id !== doc.id)])
}

export function forgetOwned(id: string) {
  saveOwned(ownedDocs().filter((d) => d.id !== id))
}

export const editTokenFor = (id: string) => ownedDocs().find((d) => d.id === id)?.edit_token

async function request<T>(method: string, path: string, body?: unknown, headers: Record<string, string> = {}): Promise<T> {
  const h: Record<string, string> = { ...headers }
  if (body !== undefined) h['Content-Type'] = 'application/json'
  const token = getToken()
  if (token) h['Authorization'] = `Token ${token}`
  const res = await fetch(`/api${path}`, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) })
  if (res.status === 204) return undefined as T
  let data: Record<string, unknown> = {}
  try {
    data = await res.json()
  } catch {
    /* non-JSON */
  }
  if (!res.ok) {
    if (res.status === 401 && token && data.code !== 'passcode_required') setToken(null)
    const message = (data.detail as string) || (res.status === 404 ? 'Not found.' : 'Something went wrong.')
    throw new ApiError(res.status, message, data.code as string | undefined)
  }
  return data as T
}

function docHeaders(id: string, passcode?: string) {
  const h: Record<string, string> = {}
  const t = editTokenFor(id)
  if (t) h['X-Edit-Token'] = t
  if (passcode) h['X-Passcode'] = passcode
  return h
}

export const api = {
  getDoc: (id: string, passcode?: string) => request<Doc>('GET', `/docs/${id}/`, undefined, docHeaders(id, passcode)),
  createDoc: (body: { content: string; expiry: Expiry; passcode?: string }) =>
    request<Doc>('POST', '/docs/', body, { 'X-Anon-Id': anonId() }),
  updateDoc: (id: string, body: { content?: string; expiry?: Expiry; passcode?: string }) =>
    request<Doc>('PATCH', `/docs/${id}/`, body, docHeaders(id)),
  deleteDoc: (id: string) => request<void>('DELETE', `/docs/${id}/`, undefined, docHeaders(id)),
  listDocs: () => request<Doc[]>('GET', '/docs/'),
  claim: (items: { id: string; edit_token: string }[]) => request<{ claimed: string[] }>('POST', '/docs/claim/', { items }),
  login: (email: string, password: string) => request<{ token: string; user: User }>('POST', '/auth/login/', { email, password }),
  register: (email: string, password: string) => request<{ token: string; user: User }>('POST', '/auth/register/', { email, password }),
  logout: () => request<void>('POST', '/auth/logout/'),
  me: () => request<User>('GET', '/auth/me/'),
}

export function relativeExpiry(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now()
  if (ms <= 0) return 'Expired'
  const hours = Math.round(ms / 36e5)
  if (hours < 1) return 'Expires in under an hour'
  if (hours < 48) return `Expires in ${hours} hour${hours === 1 ? '' : 's'}`
  return `Expires in ${Math.round(hours / 24)} days`
}

export function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export const docUrl = (id: string) => `${location.origin}/doc/${id}`
