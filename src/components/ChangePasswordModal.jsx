import { useState } from 'react'
import { changePassword } from '../lib/auth'
import { FIELD, LABEL } from '../lib/ui'

// Self-service password change for the signed-in user.
export default function ChangePasswordModal({ onClose }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (next.length < 8) return setError('New password must be at least 8 characters.')
    if (next !== confirm) return setError('New passwords do not match.')
    setBusy(true)
    try {
      await changePassword(current, next)
      setDone(true)
    } catch (err) {
      setError(err.message || 'Could not change password.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5 animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-bold text-green-4 mb-3">Change password</h3>
        {done ? (
          <div>
            <div className="bg-green-2/10 border border-green-2/30 text-green-4 text-sm rounded-lg px-3 py-2">Password updated.</div>
            <button onClick={onClose} className="w-full mt-4 py-2 rounded-lg bg-green-2 hover:bg-green-3 text-white font-bold text-sm transition-colors">Done</button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className={LABEL}>Current password</label>
              <input type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} className={`${FIELD} w-full mt-1`} required />
            </div>
            <div>
              <label className={LABEL}>New password</label>
              <input type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} className={`${FIELD} w-full mt-1`} required />
            </div>
            <div>
              <label className={LABEL}>Confirm new password</label>
              <input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={`${FIELD} w-full mt-1`} required />
            </div>
            {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>}
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg border border-green-4/15 text-green-4/70 font-bold text-sm hover:border-green-2 transition-colors">Cancel</button>
              <button type="submit" disabled={busy} className="flex-1 py-2 rounded-lg bg-green-2 hover:bg-green-3 disabled:opacity-50 text-white font-bold text-sm transition-colors">{busy ? 'Saving…' : 'Update'}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
