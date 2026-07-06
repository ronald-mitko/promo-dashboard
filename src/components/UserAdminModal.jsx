import { useState, useEffect, useCallback } from 'react'
import { listUsers, createUser, updateUser, deleteUser } from '../lib/auth'
import { FIELD, LABEL } from '../lib/ui'

// Admin-only user management: list, add, reset password, toggle admin, remove.
export default function UserAdminModal({ onClose, currentUser }) {
  const [users, setUsers] = useState(null)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ username: '', name: '', password: '', admin: false })
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    setError('')
    listUsers().then(setUsers).catch((e) => setError(e.message))
  }, [])
  useEffect(() => { load() }, [load])

  const add = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await createUser(form)
      setForm({ username: '', name: '', password: '', admin: false })
      load()
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  const reset = async (username) => {
    const pw = window.prompt(`New password for ${username} (min 8 chars):`)
    if (!pw) return
    try { await updateUser({ username, password: pw }); setError('') } catch (err) { setError(err.message) }
  }
  const toggleAdmin = async (u) => {
    try { await updateUser({ username: u.username, admin: !u.is_admin }); load() } catch (err) { setError(err.message) }
  }
  const remove = async (username) => {
    if (!window.confirm(`Remove ${username}? This cannot be undone.`)) return
    try { await deleteUser(username); load() } catch (err) { setError(err.message) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-5 animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold text-green-4">Manage users</h3>
          <button onClick={onClose} className="text-green-4/40 hover:text-green-4 text-sm font-bold">Close</button>
        </div>

        {error && <div className="mb-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>}

        {/* Existing users */}
        <div className="space-y-2 mb-5">
          {users === null ? (
            <div className="text-sm text-green-4/40 py-4 text-center">Loading…</div>
          ) : users.length === 0 ? (
            <div className="text-sm text-green-4/40 py-4 text-center">No users yet.</div>
          ) : users.map((u) => (
            <div key={u.username} className="flex items-center gap-2 border border-green-4/8 rounded-xl px-3 py-2">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-green-4 truncate">
                  {u.name || u.username}
                  {u.is_admin && <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-3/15 text-orange-3 uppercase tracking-wider">Admin</span>}
                  {u.username === currentUser && <span className="ml-1 text-[10px] text-green-4/40">(you)</span>}
                </div>
                <div className="text-xs text-green-4/50 truncate">{u.username}</div>
              </div>
              <button onClick={() => reset(u.username)} className="text-xs font-bold text-green-3 hover:text-green-4">Reset pw</button>
              <button onClick={() => toggleAdmin(u)} className="text-xs font-bold text-green-4/60 hover:text-green-4">{u.is_admin ? 'Revoke admin' : 'Make admin'}</button>
              {u.username !== currentUser && <button onClick={() => remove(u.username)} className="text-xs font-bold text-red-500 hover:text-red-600">Remove</button>}
            </div>
          ))}
        </div>

        {/* Add user */}
        <form onSubmit={add} className="border-t border-green-4/10 pt-4">
          <div className="text-xs font-bold text-green-4/50 uppercase tracking-wider mb-2">Add user</div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={LABEL}>Username</label>
              <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className={`${FIELD} w-full mt-1`} required />
            </div>
            <div>
              <label className={LABEL}>Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={`${FIELD} w-full mt-1`} />
            </div>
          </div>
          <div className="mt-2">
            <label className={LABEL}>Temporary password (min 8)</label>
            <input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={`${FIELD} w-full mt-1`} required />
          </div>
          <label className="flex items-center gap-2 mt-2 text-sm text-green-4/80">
            <input type="checkbox" checked={form.admin} onChange={(e) => setForm({ ...form, admin: e.target.checked })} />
            Admin
          </label>
          <button type="submit" disabled={busy} className="w-full mt-3 py-2 rounded-lg bg-green-2 hover:bg-green-3 disabled:opacity-50 text-white font-bold text-sm transition-colors">{busy ? 'Adding…' : 'Add user'}</button>
        </form>
      </div>
    </div>
  )
}
