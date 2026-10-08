import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Markdown from '../components/Markdown'
import MarkdownEditor from '../components/MarkdownEditor'
import SharePanel from '../components/SharePanel'
import { useToast } from '../components/Toast'
import TopBar from '../components/TopBar'
import { api, ApiError, rememberOwned, storageGet, storageSet, type Doc, type Expiry } from '../lib/api'

type Mode = 'write' | 'split' | 'preview'
const MODE_KEY = 'mdify:mode'

const WELCOME = `# Untitled

Write **Markdown** here. Hit *Share* to publish it as a link.

- Lists, tables, code blocks and quotes are supported
- Drafts save automatically in this browser
`

function initialMode(): Mode {
  const saved = storageGet(MODE_KEY) as Mode | null
  if (saved === 'write' || saved === 'split' || saved === 'preview') return saved
  return window.innerWidth >= 1000 ? 'split' : 'write'
}

export default function EditorPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const draftKey = id ? `mdify:draft:${id}` : 'mdify:draft'

  const [doc, setDoc] = useState<Doc | null>(null)
  const [content, setContent] = useState<string>(() => (id ? '' : storageGet('mdify:draft') ?? WELCOME))
  const [loading, setLoading] = useState(!!id)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [mode, setMode] = useState<Mode>(initialMode)
  const [shareOpen, setShareOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const contentRef = useRef(content)
  contentRef.current = content

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    api
      .getDoc(id)
      .then((d) => {
        if (cancelled) return
        if (!d.can_edit) {
          navigate(`/doc/${id}`, { replace: true })
          return
        }
        setDoc(d)
        const draft = storageGet(`mdify:draft:${id}`)
        setContent(draft ?? d.content ?? '')
        setDirty(draft !== null && draft !== d.content)
      })
      .catch((e: ApiError) => !cancelled && setLoadError(e.status === 404 ? 'This document does not exist or has expired.' : e.message))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [id, navigate])

  const onChange = useCallback(
    (v: string) => {
      setContent(v)
      setDirty(true)
      storageSet(draftKey, v)
    },
    [draftKey],
  )

  const changeMode = (m: Mode) => {
    setMode(m)
    storageSet(MODE_KEY, m)
  }

  const save = useCallback(async () => {
    if (!doc) return
    setBusy(true)
    try {
      const updated = await api.updateDoc(doc.id, { content: contentRef.current })
      setDoc(updated)
      rememberOwned(updated)
      storageSet(draftKey, null)
      setDirty(false)
      toast('Saved')
    } catch (e) {
      toast((e as Error).message)
    } finally {
      setBusy(false)
    }
  }, [doc, draftKey, toast])

  const publish = async (opts: { expiry?: Expiry; passcode?: string }) => {
    setBusy(true)
    setError(null)
    try {
      if (doc) {
        const updated = await api.updateDoc(doc.id, { ...opts, content: contentRef.current })
        setDoc(updated)
        rememberOwned(updated)
        storageSet(draftKey, null)
        setDirty(false)
        toast('Link updated')
      } else {
        const created = await api.createDoc({ content: contentRef.current, expiry: opts.expiry ?? '7d', passcode: opts.passcode })
        rememberOwned(created, created.edit_token)
        storageSet('mdify:draft', null)
        setDoc(created)
        setDirty(false)
        navigate(`/doc/${created.id}/edit`, { replace: true })
        toast('Published')
      }
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        if (doc) save()
        else setShareOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [doc, save])

  const words = content.trim() ? content.trim().split(/\s+/).length : 0

  const modeSwitch = (
    <div className="segmented" role="tablist" aria-label="View mode">
      {(['write', 'split', 'preview'] as Mode[]).map((m) => (
        <button key={m} role="tab" aria-selected={mode === m} className={mode === m ? 'active' : ''} onClick={() => changeMode(m)}>
          {m[0].toUpperCase() + m.slice(1)}
        </button>
      ))}
    </div>
  )

  if (loadError) {
    return (
      <>
        <TopBar />
        <main className="center-message">
          <p>{loadError}</p>
          <Link to="/" className="btn btn-secondary">New document</Link>
        </main>
      </>
    )
  }

  return (
    <>
      <TopBar center={modeSwitch}>
        {doc && (
          <Link to={`/doc/${doc.id}`} className="btn btn-ghost">
            View
          </Link>
        )}
        {doc && (
          <button className="btn btn-secondary" disabled={busy || !dirty} onClick={save}>
            {dirty ? 'Save' : 'Saved'}
          </button>
        )}
        <div className="popover-anchor">
          <button className="btn btn-primary" onClick={() => setShareOpen((o) => !o)} disabled={!content.trim()}>
            Share
          </button>
          {shareOpen && <SharePanel doc={doc} busy={busy} error={error} onPublish={publish} onClose={() => setShareOpen(false)} />}
        </div>
      </TopBar>
      <main className={`editor-layout mode-${mode}`}>
        {loading ? (
          <div className="page"><p className="muted">Loading…</p></div>
        ) : (
          <>
            {mode !== 'preview' && (
              <section className="pane pane-editor">
                <div className="page">
                  <MarkdownEditor value={content} onChange={onChange} />
                </div>
              </section>
            )}
            {mode !== 'write' && (
              <section className="pane pane-preview">
                <div className="page">
                  {content.trim() ? <Markdown content={content} /> : <p className="muted">Nothing to preview yet.</p>}
                </div>
              </section>
            )}
          </>
        )}
      </main>
      <footer className="statusbar">
        {words} words{doc ? '' : ' · Draft saved in this browser'}
      </footer>
    </>
  )
}
