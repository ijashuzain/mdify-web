import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, getToken, ownedDocs, saveOwned, setToken, type User } from './api'

type AuthState = {
  user: User | null
  ready: boolean
  signIn: (email: string, password: string, isNew: boolean) => Promise<void>
  signOut: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(!getToken())

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setUser(null)
      return
    }
    try {
      setUser(await api.me())
    } catch {
      setUser(null)
    } finally {
      setReady(true)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const signIn = useCallback(async (email: string, password: string, isNew: boolean) => {
    const res = isNew ? await api.register(email, password) : await api.login(email, password)
    setToken(res.token)
    // Move documents published as a guest in this browser into the account.
    const owned = ownedDocs()
    if (owned.length) {
      try {
        const { claimed } = await api.claim(owned.map(({ id, edit_token }) => ({ id, edit_token })))
        saveOwned(owned.filter((d) => !claimed.includes(d.id)))
      } catch {
        /* keep guest docs locally */
      }
    }
    setUser(await api.me())
  }, [])

  const signOut = useCallback(async () => {
    try {
      await api.logout()
    } catch {
      /* token may already be invalid */
    }
    setToken(null)
    setUser(null)
  }, [])

  return <AuthContext.Provider value={{ user, ready, signIn, signOut, refresh }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth outside AuthProvider')
  return ctx
}
