import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { BookmarkIcon, CheckIcon, CopyIcon, DownloadIcon, EditIcon, LinkIcon, LockIcon, PlusIcon } from '../components/Icons'
import Markdown from '../components/Markdown'
import { useToast } from '../components/Toast'
import TopBar from '../components/TopBar'
import { api, ApiError, rememberOwned, relativeExpiry, shortDate, storageGet, storageSet, type Doc } from '../lib/api'
import { useAuth } from '../lib/auth'

// Original doc id -> id of the copy saved from it in this browser.
const SAVED_KEY = 'mdify:saved'

function savedCopies(): Record<string, string> {
  try {
    return JSON.parse(storageGet(SAVED_KEY) || '{}')
  } catch {
    return {}
  }
}

export default function ViewerPage() {
  const { id = '' } = useParams()
  const toast = useToast()
  const [doc, setDoc] = useState<Doc | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'locked' | 'missing'>('loading')
  const [passcode, setPasscode] = useState('')
  const [passError, setPassError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const { user } = useAuth()
  const [savedId, setSavedId] = useState<string | null>(() => savedCopies()[id] ?? null)
  const [saving, setSaving] = useState(false)

  const saveCopy = async () => {
    if (!doc?.content) return
    setSaving(true)
    try {
      const copy = await api.createDoc({ content: doc.content, expiry: user ? '90d' : '7d' })
      rememberOwned(copy, copy.edit_token)
      storageSet(SAVED_KEY, JSON.stringify({ ...savedCopies(), [doc.id]: copy.id }))
      setSavedId(copy.id)
      toast(user ? 'Saved to your docs' : 'Saved for 7 days. Sign in to keep it for 90 days')
    } catch (e) {
      toast((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const load = async (code?: string) => {
    try {
      const d = await api.getDoc(id, code)
      setDoc(d)
      setState('ready')
      document.title = `${d.title} — mdify`
    } catch (e) {
      const err = e as ApiError
      if (err.code === 'passcode_required') {
        setState('locked')
        if (code) setPassError('Incorrect passcode.')
      } else if (err.status === 429) {
        setState('locked')
        setPassError(err.message)
      } else setState('missing')
    }
  }

  useEffect(() => {
    load()
    return () => {
      document.title = 'mdify — write & share Markdown'
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const unlock = (e: FormEvent) => {
    e.preventDefault()
    setPassError(null)
    load(passcode)
  }

  const copyRaw = async () => {
    if (!doc?.content) return
    await navigator.clipboard.writeText(doc.content)
    setCopied(true)
    toast('Markdown copied')
    setTimeout(() => setCopied(false), 1500)
  }

  const download = () => {
    if (!doc?.content) return
    const url = URL.createObjectURL(new Blob([doc.content], { type: 'text/markdown;charset=utf-8' }))
    const a = document.createElement('a')
    const name = doc.title.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').toLowerCase() || doc.id
    a.href = url
    a.download = `${name}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const copyLink = async () => {
    await navigator.clipboard.writeText(location.href)
    toast('Link copied')
  }

  return (
    <>
      <TopBar>
        {state === 'ready' && doc && (
          <div className="icon-actions">
            <button className="icon-btn" onClick={copyRaw} title="Copy Markdown" aria-label="Copy Markdown">
              {copied ? <CheckIcon /> : <CopyIcon />}
            </button>
            <button className="icon-btn" onClick={download} title="Download .md" aria-label="Download .md">
              <DownloadIcon />
            </button>
            {doc.can_edit && (
              <Link className="icon-btn" to={`/doc/${doc.id}/edit`} title="Edit" aria-label="Edit">
                <EditIcon />
              </Link>
            )}
            {!doc.can_edit &&
              (savedId ? (
                <Link className="btn btn-ghost btn-save" to={`/doc/${savedId}/edit`} title="Open your saved copy" aria-label="Saved. Open your copy">
                  <CheckIcon size={14} /> <span className="btn-label">Saved</span>
                </Link>
              ) : (
                <button className="btn btn-ghost btn-save" onClick={saveCopy} disabled={saving} title="Save a copy to your docs" aria-label="Save to my docs">
                  <BookmarkIcon size={14} /> <span className="btn-label">{saving ? 'Saving…' : 'Save to my docs'}</span>
                </button>
              ))}
            <button className="btn btn-secondary btn-copy-link" onClick={copyLink} aria-label="Copy link">
              <span className="btn-icon"><LinkIcon size={14} /></span>
              <span className="btn-label">Copy link</span>
            </button>
          </div>
        )}
        <Link to="/" className="icon-btn" title="New document" aria-label="New document">
          <PlusIcon />
        </Link>
      </TopBar>

      {state === 'loading' && <main className="page reader"><p className="muted">Loading…</p></main>}

      {state === 'missing' && (
        <main className="center-message">
          <h1>Document not found</h1>
          <p className="muted">It may have expired or been deleted.</p>
          <Link to="/" className="btn btn-primary">Write a new one</Link>
        </main>
      )}

      {state === 'locked' && (
        <main className="center-message">
          <form className="card narrow" onSubmit={unlock}>
            <div className="lock-icon"><LockIcon size={20} /></div>
            <h1 className="card-title">Protected document</h1>
            <p className="muted small">Enter the passcode to view it.</p>
            <input className="input" type="password" autoFocus value={passcode} onChange={(e) => setPasscode(e.target.value)} placeholder="Passcode" />
            {passError && <p className="error small">{passError}</p>}
            <button className="btn btn-primary btn-block" disabled={!passcode}>Unlock</button>
          </form>
        </main>
      )}

      {state === 'ready' && doc && (
        <main className="page reader">
          <Markdown content={doc.content ?? ''} />
          <p className="doc-meta">
            Published {shortDate(doc.created_at)} · {relativeExpiry(doc.expires_at)}
            {doc.can_edit ? ` · ${doc.views} views` : ''}
          </p>
        </main>
      )}
    </>
  )
}
