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

async function jsonOrThrow(r) {
  const data = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(data.error || `Request failed (${r.status})`)
  return data
}

// ── Self-service ──
export async function changePassword(currentPassword, newPassword) {
  return jsonOrThrow(await fetch('/api/auth/password', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentPassword, newPassword }),
  }))
}

// ── Admin: user management ──
export async function listUsers() {
  return jsonOrThrow(await fetch('/api/auth/users'))
}
export async function createUser(payload) {
  return jsonOrThrow(await fetch('/api/auth/users', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  }))
}
export async function updateUser(payload) {
  return jsonOrThrow(await fetch('/api/auth/users', {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  }))
}
export async function deleteUser(username) {
  return jsonOrThrow(await fetch(`/api/auth/users?username=${encodeURIComponent(username)}`, { method: 'DELETE' }))
}

// ── Invite links (set-password) ──
export async function inviteUser(username) {
  return jsonOrThrow(await fetch('/api/auth/invite', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username }),
  })) // → { ok, username, link }
}
export async function validateInvite(token) {
  return jsonOrThrow(await fetch(`/api/auth/invite?token=${encodeURIComponent(token)}`)) // → { username }
}
export async function setPasswordWithInvite(token, password) {
  return jsonOrThrow(await fetch('/api/auth/set-password', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, password }),
  }))
}
