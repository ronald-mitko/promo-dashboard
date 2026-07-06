import { useState, useEffect } from 'react'
import { validateInvite, setPasswordWithInvite } from '../lib/auth'
import { FIELD, LABEL } from '../lib/ui'

// Reached via an invite link (?invite=<token>). Validates the token, lets the
// user set their own password, then signs them in.
export default function SetPasswordView({ token }) {
  const [state, setState] = useState({ phase: 'checking', username: '', error: '' })
  const [pw, setPw] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    validateInvite(token)
      .then((r) => setState({ phase: 'ready', username: r.username, error: '' }))
      .catch((e) => setState({ phase: 'invalid', username: '', error: e.message }))
  }, [token])

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (pw.length < 8) return setError('Password must be at least 8 characters.')
    if (pw !== confirm) return setError('Passwords do not match.')
    setBusy(true)
    try {
      await setPasswordWithInvite(token, pw)
      // Signed in by the server — drop the token from the URL and enter the app.
      window.location.replace('/')
    } catch (err) {
      setError(err.message || 'Could not set your password.')
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-6 justify-center">
          <div className="w-10 h-10 bg-green-3 rounded-xl flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="currentColor"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
          </div>
          <div>
            <h1 className="text-lg font-bold text-green-4 leading-tight">HQ to Retail Connector</h1>
            <p className="text-xs text-green-4/60 leading-tight">Advantage Solutions</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-green-4/8 p-6">
          {state.phase === 'checking' && <div className="text-sm text-green-4/50 text-center py-4">Checking your link…</div>}

          {state.phase === 'invalid' && (
            <div className="text-center">
              <h2 className="text-base font-bold text-green-4 mb-1">Link expired</h2>
              <p className="text-sm text-green-4/60">{state.error || 'This link is invalid or has expired.'} Ask an admin for a new one.</p>
              <a href="/" className="inline-block mt-4 text-xs font-bold text-green-3 hover:text-green-4">Go to sign in</a>
            </div>
          )}

          {state.phase === 'ready' && (
            <form onSubmit={submit}>
              <h2 className="text-base font-bold text-green-4 mb-1">Set your password</h2>
              <p className="text-sm text-green-4/60 mb-4">Welcome, <span className="font-semibold text-green-4">{state.username}</span>. Choose a password to finish setting up your account.</p>
              <label className={LABEL}>New password</label>
              <input type="password" autoFocus autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} className={`${FIELD} w-full mt-1 mb-3`} required />
              <label className={LABEL}>Confirm password</label>
              <input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={`${FIELD} w-full mt-1`} required />
              {error && <div className="mt-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>}
              <button type="submit" disabled={busy} className="w-full mt-4 py-3 rounded-xl bg-green-2 hover:bg-green-3 disabled:opacity-50 text-white font-bold text-sm transition-colors shadow-sm">{busy ? 'Saving…' : 'Set password & sign in'}</button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
