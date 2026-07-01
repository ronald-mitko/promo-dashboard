import { useState } from 'react'
import { login } from '../lib/auth'
import { FIELD } from '../lib/ui'

// Username + password sign-in. On success, refreshes the gate to reveal the app.
export default function LoginView({ onSignedIn }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await login(username, password)
      onSignedIn?.()
    } catch (err) {
      setError(err.message || 'Sign-in failed. Please try again.')
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-6 justify-center">
          <div className="w-10 h-10 bg-green-3 rounded-xl flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="currentColor">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold text-green-4 leading-tight">HQ to Retail Connector</h1>
            <p className="text-xs text-green-4/60 leading-tight">Advantage Solutions</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-green-4/8 p-6">
          <form onSubmit={submit}>
            <h2 className="text-base font-bold text-green-4 mb-1">Sign in</h2>
            <p className="text-sm text-green-4/60 mb-4">Enter the credentials provided to you.</p>

            <label className="text-xs font-semibold text-green-4/60 uppercase tracking-wider">Username</label>
            <input
              type="text"
              required
              autoFocus
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={`${FIELD} w-full mt-1 mb-3`}
            />

            <label className="text-xs font-semibold text-green-4/60 uppercase tracking-wider">Password</label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${FIELD} w-full mt-1`}
            />

            {error && (
              <div className="mt-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full mt-4 py-3 rounded-xl bg-green-2 hover:bg-green-3 disabled:opacity-50 text-white font-bold text-sm transition-colors shadow-sm"
            >
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
        <p className="text-center text-xs text-green-4/40 mt-4">Access is limited to authorized company accounts.</p>
      </div>
    </div>
  )
}
