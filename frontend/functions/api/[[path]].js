// Cloudflare Pages Function: relay /api/* to the Django backend on the VPS so the
// browser only ever talks to the Pages origin (no CORS, same auth headers).
// Origin of the mdify server on the VPS; override with the BACKEND_ORIGIN variable.
const DEFAULT_BACKEND = 'https://mdify.162-35-172-32.sslip.io'

export async function onRequest({ request, env }) {
  const url = new URL(request.url)
  const headers = new Headers(request.headers)
  headers.delete('host')
  headers.set('X-Client-IP', request.headers.get('CF-Connecting-IP') || '')
  if (env.PROXY_SECRET) headers.set('X-Mdify-Proxy', env.PROXY_SECRET)

  const init = { method: request.method, headers, redirect: 'manual' }
  if (request.method !== 'GET' && request.method !== 'HEAD') init.body = await request.arrayBuffer()

  try {
    return await fetch(`${env.BACKEND_ORIGIN || DEFAULT_BACKEND}${url.pathname}${url.search}`, init)
  } catch {
    return Response.json({ detail: 'Service temporarily unavailable.' }, { status: 502 })
  }
}
