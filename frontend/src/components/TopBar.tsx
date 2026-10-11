import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { DocIcon } from './Icons'

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
        <Link to="/docs" className="btn btn-ghost btn-docs" aria-label="Docs">
          <span className="btn-icon"><DocIcon /></span>
          <span className="btn-label">Docs</span>
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
