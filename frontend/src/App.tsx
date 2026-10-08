import { lazy, Suspense } from 'react'
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'
import { ToastProvider } from './components/Toast'
import { AuthProvider } from './lib/auth'
import AuthPage from './pages/AuthPage'
import DocsPage from './pages/DocsPage'
import ViewerPage from './pages/ViewerPage'

// The editor pulls in CodeMirror; keep it out of the viewer's bundle.
const EditorPage = lazy(() => import('./pages/EditorPage'))

function NotFound() {
  return (
    <main className="center-message">
      <h1>Page not found</h1>
      <Link to="/" className="btn btn-primary">Go home</Link>
    </main>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Suspense fallback={null}>
            <Routes>
              <Route path="/" element={<EditorPage />} />
              <Route path="/doc/:id" element={<ViewerPage />} />
              <Route path="/doc/:id/edit" element={<EditorPage />} />
              <Route path="/docs" element={<DocsPage />} />
              <Route path="/login" element={<AuthPage isNew={false} />} />
              <Route path="/signup" element={<AuthPage isNew />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
