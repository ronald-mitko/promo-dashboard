import { createContext, useContext, useState, useEffect } from 'react'
import { apiEnabled } from '../lib/api'
import { getMe } from '../lib/auth'
import LoginView from '../views/LoginView'

// Exposes the signed-in identity to the app (user/name/admin + whether auth is enforced).
const AuthContext = createContext({ user: null, name: null, admin: false, configured: false })
export const useAuth = () => useContext(AuthContext)

// Gates the app behind username/password auth when it's enabled server-side.
// - No backend (local seed dev, VITE_API off) → render the app, no auth.
// - Auth not configured server-side (no AUTH_SECRET/AUTH_USERS) → render the app.
// - Configured + authenticated → render the app.
// - Configured + not authenticated → show the login screen.
export default function AuthGate({ children }) {
  const [state, setState] = useState(() =>
    apiEnabled()
      ? { loading: true, ok: false, user: null, name: null, admin: false, configured: false }
      : { loading: false, ok: true, user: null, name: null, admin: false, configured: false },
  )

  const refresh = () => getMe().then((m) =>
    setState({ loading: false, ok: !m.configured || m.authenticated, user: m.user, name: m.name, admin: !!m.admin, configured: m.configured }),
  )

  useEffect(() => {
    if (!apiEnabled()) return
    let alive = true
    getMe().then((m) => {
      if (!alive) return
      setState({ loading: false, ok: !m.configured || m.authenticated, user: m.user, name: m.name, admin: !!m.admin, configured: m.configured })
    })
    return () => { alive = false }
  }, [])

  if (state.loading) {
    return <div className="min-h-screen bg-cream flex items-center justify-center text-green-4/50 text-sm">Loading…</div>
  }
  if (!state.ok) return <LoginView onSignedIn={refresh} />

  return (
    <AuthContext.Provider value={{ user: state.user, name: state.name, admin: state.admin, configured: state.configured }}>
      {children}
    </AuthContext.Provider>
  )
}
