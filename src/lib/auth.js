// ─────────────────────────────────────────────
// Client for the username/password auth API (/api/auth/*). Same-origin, so the
// session cookie flows automatically.
// ─────────────────────────────────────────────

export async function getMe() {
  try {
    const r = await fetch('/api/auth/me')
    if (!r.ok) return { configured: false, authenticated: false, user: null, name: null }
    return r.json()
  } catch {
    // Network/handler missing → behave as if auth is off (don't lock the user out).
    return { configured: false, authenticated: false, user: null, name: null }
  }
}

export async function login(username, password) {
  const r = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  const data = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(data.error || `Sign-in failed (${r.status})`)
  return data // { ok, user, name }
}

export async function logout() {
  try { await fetch('/api/auth/logout', { method: 'POST' }) } catch { /* ignore */ }
}
