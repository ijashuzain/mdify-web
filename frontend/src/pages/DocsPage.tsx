import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { DocIcon, LinkIcon, LockIcon, TrashIcon } from '../components/Icons'
import { useToast } from '../components/Toast'
import TopBar from '../components/TopBar'
import { api, docUrl, forgetOwned, ownedDocs, relativeExpiry, shortDate } from '../lib/api'
import { useAuth } from '../lib/auth'

type Row = { id: string; title: string; expires_at: string; updated_at?: string; has_passcode?: boolean }

export default function DocsPage() {
  const { user, ready, signOut, refresh } = useAuth()
  const toast = useToast()
  const [rows, setRows] = useState<Row[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!ready) return
    if (!user) {
      setRows(ownedDocs())
      return
    }
    api
      .listDocs()
      .then(setRows)
      .catch((e: Error) => setError(e.message))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, user?.email])

  const remove = async (row: Row) => {
    if (!confirm(`Delete “${row.title}”? The link will stop working.`)) return
    try {
      await api.deleteDoc(row.id)
    } catch (e) {
      if ((e as { status?: number }).status !== 404) {
        toast((e as Error).message)
        return
      }
    }
    forgetOwned(row.id)
    setRows((r) => r?.filter((x) => x.id !== row.id) ?? null)
    if (user) refresh()
    toast('Deleted')
  }

  const copy = async (id: string) => {
    await navigator.clipboard.writeText(docUrl(id))
    toast('Link copied')
  }

  const limit = user ? user.max_docs : 10
  const count = rows?.length ?? 0

  return (
    <>
      <TopBar>
        <Link to="/" className="btn btn-primary">New</Link>
      </TopBar>
      <main className="page list-page">
        <h1 className="page-title">Documents</h1>
        <p className="muted small">
          {user ? (
            <>
              Signed in as {user.email} · {count} of {limit} documents · kept up to {user.max_days} days ·{' '}
              <button className="link-btn" onClick={signOut}>Sign out</button>
            </>
          ) : (
            <>
              Guest documents in this browser · {count} of {limit} · kept up to 7 days.{' '}
              <Link to="/login">Sign in</Link> to keep 100 documents for 90 days.
            </>
          )}
        </p>

        {error && <p className="error">{error}</p>}
        {rows === null && !error && <p className="muted">Loading…</p>}
        {rows?.length === 0 && (
          <div className="empty">
            <p className="muted">No documents yet.</p>
            <Link to="/" className="btn btn-secondary">Write your first one</Link>
          </div>
        )}

        <ul className="doc-list">
          {rows?.map((row) => (
            <li key={row.id} className="doc-row">
              <Link to={`/doc/${row.id}`} className="doc-row-main">
                <span className="doc-row-icon"><DocIcon /></span>
                <span className="doc-row-title">{row.title || 'Untitled'}</span>
                {row.has_passcode && <span className="doc-row-badge" title="Passcode protected"><LockIcon size={13} /></span>}
              </Link>
              <span className="doc-row-meta">
                {row.updated_at ? `${shortDate(row.updated_at)} · ` : ''}
                {relativeExpiry(row.expires_at)}
              </span>
              <span className="doc-row-actions">
                <Link to={`/doc/${row.id}/edit`} className="btn btn-ghost btn-sm">Edit</Link>
                <button className="icon-btn" onClick={() => copy(row.id)} title="Copy link" aria-label="Copy link"><LinkIcon /></button>
                <button className="icon-btn" onClick={() => remove(row)} title="Delete" aria-label="Delete"><TrashIcon /></button>
              </span>
            </li>
          ))}
        </ul>
      </main>
    </>
  )
}
