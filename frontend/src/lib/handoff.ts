// Imports browser data forwarded from the old mdify domains (see frontend/handoff/).
const PREFIX = '#handoff='

type OwnedEntry = { id: string }

function mergeList(current: string | null, incoming: string): string {
  const mine = JSON.parse(current || '[]') as OwnedEntry[]
  const theirs = JSON.parse(incoming) as OwnedEntry[]
  const ids = new Set(mine.map((d) => d.id))
  return JSON.stringify([...mine, ...theirs.filter((d) => !ids.has(d.id))])
}

export function importHandoff() {
  if (!location.hash.startsWith(PREFIX)) return
  try {
    const json = decodeURIComponent(escape(atob(decodeURIComponent(location.hash.slice(PREFIX.length)))))
    const data = JSON.parse(json) as Record<string, string>
    for (const [key, value] of Object.entries(data)) {
      if (!key.startsWith('mdify:') || typeof value !== 'string') continue
      const current = localStorage.getItem(key)
      if (key === 'mdify:owned') localStorage.setItem(key, mergeList(current, value))
      else if (key === 'mdify:saved') localStorage.setItem(key, JSON.stringify({ ...JSON.parse(value), ...JSON.parse(current || '{}') }))
      else if (current === null) localStorage.setItem(key, value)
    }
  } catch {
    /* ignore malformed or unavailable storage */
  }
  history.replaceState(null, '', location.pathname + location.search)
}
