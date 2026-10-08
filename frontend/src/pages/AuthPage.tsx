import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import TopBar from '../components/TopBar'
import { useAuth } from '../lib/auth'

export default function AuthPage({ isNew }: { isNew: boolean }) {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await signIn(email, password, isNew)
      navigate('/docs')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <TopBar />
      <main className="center-message">
        <form className="card narrow" onSubmit={submit}>
          <h1 className="card-title">{isNew ? 'Create an account' : 'Sign in to mdify'}</h1>
          <p className="muted small">Optional. Keep up to 100 documents for 90 days instead of 10 for 7 days.</p>
          <input className="input" type="email" placeholder="Email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
          <input
            className="input"
            type="password"
            placeholder={isNew ? 'Password (8+ characters)' : 'Password'}
            autoComplete={isNew ? 'new-password' : 'current-password'}
            required
            minLength={isNew ? 8 : undefined}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <p className="error small">{error}</p>}
          <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Please wait…' : isNew ? 'Create account' : 'Sign in'}</button>
          <p className="muted small center">
            {isNew ? (
              <>Already have an account? <Link to="/login">Sign in</Link></>
            ) : (
              <>New here? <Link to="/signup">Create an account</Link></>
            )}
          </p>
        </form>
      </main>
    </>
  )
}
