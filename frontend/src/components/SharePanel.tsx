import { useState } from 'react'
import { Link } from 'react-router-dom'
import { docUrl, relativeExpiry, type Doc, type Expiry } from '../lib/api'
import { useAuth } from '../lib/auth'
import { CheckIcon, CopyIcon } from './Icons'

const OPTIONS: { value: Expiry; label: string; member?: boolean }[] = [
  { value: '1d', label: '1 day' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days', member: true },
  { value: '90d', label: '90 days', member: true },
]

type Props = {
  doc: Doc | null
  busy: boolean
  error: string | null
  onPublish: (opts: { expiry?: Expiry; passcode?: string }) => void
  onClose: () => void
}

export default function SharePanel({ doc, busy, error, onPublish, onClose }: Props) {
  const { user } = useAuth()
  const [expiry, setExpiry] = useState<Expiry | null>(doc ? null : user ? '90d' : '7d')
  const [usePasscode, setUsePasscode] = useState(doc?.has_passcode ?? false)
  const [passcode, setPasscode] = useState('')
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    if (!doc) return
    await navigator.clipboard.writeText(docUrl(doc.id))
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const submit = () => {
    const opts: { expiry?: Expiry; passcode?: string } = {}
    if (expiry) opts.expiry = expiry
    if (!usePasscode) opts.passcode = ''
    else if (passcode) opts.passcode = passcode
    onPublish(opts)
  }

  const passcodeMissing = usePasscode && !passcode && !doc?.has_passcode

  return (
    <>
      <div className="popover-scrim" onClick={onClose} />
      <div className="popover" role="dialog" aria-label="Share">
        {doc && (
          <div className="share-link">
            <input readOnly value={docUrl(doc.id)} onFocus={(e) => e.currentTarget.select()} aria-label="Share link" />
            <button className="btn btn-primary btn-sm" onClick={copy}>
              {copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        )}
        {doc && <p className="muted small share-meta">{relativeExpiry(doc.expires_at)} · {doc.views} views</p>}

        <div className="field">
          <span className="field-label">{doc ? 'Extend link for' : 'Link expires after'}</span>
          <div className="segmented segmented-wide">
            {OPTIONS.map((o) => {
              const locked = o.member && !user
              return (
                <button
                  key={o.value}
                  className={expiry === o.value ? 'active' : ''}
                  disabled={locked}
                  title={locked ? 'Sign in to keep documents up to 90 days' : undefined}
                  onClick={() => setExpiry(doc && expiry === o.value ? null : o.value)}
                >
                  {o.label}
                </button>
              )
            })}
          </div>
          {!user && (
            <p className="muted small">
              Guests keep up to 10 documents for 7 days. <Link to="/login">Sign in</Link> for 100 documents and 90 days.
            </p>
          )}
        </div>

        <label className="toggle">
          <input type="checkbox" checked={usePasscode} onChange={(e) => setUsePasscode(e.target.checked)} />
          <span>Protect with passcode</span>
        </label>
        {usePasscode && (
          <input
            className="input"
            type="password"
            placeholder={doc?.has_passcode ? 'Leave blank to keep current passcode' : 'Passcode'}
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            autoComplete="new-password"
          />
        )}

        {error && <p className="error small">{error}</p>}

        <button className="btn btn-primary btn-block" disabled={busy || passcodeMissing} onClick={submit}>
          {busy ? 'Saving…' : doc ? 'Update link settings' : 'Publish & get link'}
        </button>
      </div>
    </>
  )
}
