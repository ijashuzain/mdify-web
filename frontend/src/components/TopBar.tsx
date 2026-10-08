import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'

export default function TopBar({ center, children }: { center?: ReactNode; children?: ReactNode }) {
  const { user } = useAuth()
  return (
    <header className="topbar">
      <div className="topbar-left">
        <Link to="/" className="wordmark" aria-label="mdify home">
          <span className="wordmark-mark">M↓</span>mdify
        </Link>
      </div>
      <div className="topbar-center">{center}</div>
      <nav className="topbar-right">
        <Link to="/docs" className="btn btn-ghost">
          Docs
        </Link>
        {user ? null : (
          <Link to="/login" className="btn btn-ghost">
            Sign in
          </Link>
        )}
        {children}
      </nav>
    </header>
  )
}
