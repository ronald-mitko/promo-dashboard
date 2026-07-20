import { useState, useEffect, useCallback } from 'react'
import { listUsers, createUser, updateUser, deleteUser, inviteUser } from '../lib/auth'
import { FIELD, LABEL } from '../lib/ui'

// Admin-only user management: list, add (with invite link), reset, role, remove.
export default function UserAdminModal({ onClose, currentUser }) {
  const [users, setUsers] = useState(null)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ username: '', name: '', email: '', password: '', admin: false })
  const [busy, setBusy] = useState(false)
  const [invite, setInvite] = useState(null) // { username, link }
  const [copied, setCopied] = useState(false)
  // Bulk add
  const [bulkText, setBulkText] = useState('')
  const [bulkPw, setBulkPw] = useState('')
  const [bulkBusy, setBulkBusy] = useState(false)
  const [bulkResult, setBulkResult] = useState(null) // { created, skipped, failed }

  const load = useCallback(() => {
    setError('')
    listUsers().then(setUsers).catch((e) => setError(e.message))
  }, [])
  useEffect(() => { load() }, [load])

  // Parse a bulk line: "username, Name, email" — or a bare full name ("John Smith"
  // → john.smith) — or a bare username.
  const parseLine = (line) => {
    const s = line.trim()
    if (!s) return null
    if (s.includes(',')) {
      const [u, n, e] = s.split(',').map((x) => x.trim())
      const username = (u || '').toLowerCase()
      return username ? { username, name: n || u, email: e || '' } : null
    }
    if (/\s/.test(s)) {
      const username = s.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9._-]/g, '')
      return { username, name: s, email: '' }
    }
    return { username: s.toLowerCase(), name: s, email: '' }
  }

  const bulkAdd = async () => {
    setError('')
    setBulkResult(null)
    if (bulkPw.length < 8) { setError('Default password must be at least 8 characters.'); return }
    const rows = bulkText.split(/\r?\n/).map(parseLine).filter(Boolean)
    if (!rows.length) { setError('Enter at least one name (one per line).'); return }
    setBulkBusy(true)
    const created = []; const skipped = []; const failed = []
    for (const u of rows) {
      try {
        await createUser({ username: u.username, name: u.name, email: u.email, password: bulkPw, admin: false })
        created.push(u.username)
      } catch (e) {
        if (/already exists/i.test(e.message || '')) skipped.push(u.username)
        else failed.push(`${u.username}: ${e.message}`)
      }
    }
    setBulkBusy(false)
    setBulkResult({ created, skipped, failed })
    setBulkText('')
    load()
  }

  const showInvite = (username, link) => { setInvite({ username, link }); setCopied(false) }
  const copy = async () => {
    try { await navigator.clipboard.writeText(invite.link); setCopied(true) } catch { /* user can select manually */ }
  }

  const add = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const res = await createUser(form) // password optional; blank → res.link
      setForm({ username: '', name: '', email: '', password: '', admin: false })
      load()
      if (res.link) showInvite(res.username, res.link)
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  const sendInvite = async (username) => {
    setError('')
    try { const res = await inviteUser(username); showInvite(username, res.link) } catch (err) { setError(err.message) }
  }
  const reset = async (username) => {
    const pw = window.prompt(`Set a new password for ${username} (min 8 chars):`)
    if (!pw) return
    try { await updateUser({ username, password: pw }); setError('') } catch (err) { setError(err.message) }
  }
  const setEmailFor = async (u) => {
    const email = window.prompt(`Notification email for ${u.username}:`, u.email || '')
    if (email === null) return
    try { await updateUser({ username: u.username, email: email.trim() }); load() } catch (err) { setError(err.message) }
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

        {/* Invite link banner — copy and send however you like */}
        {invite && (
          <div className="mb-4 bg-green-2/10 border border-green-2/30 rounded-xl p-3">
            <div className="text-xs font-bold text-green-3 uppercase tracking-wider mb-1">Invite link for {invite.username}</div>
            <p className="text-xs text-green-4/60 mb-2">Send this to the user. It expires in 7 days and can be used once.</p>
            <div className="flex items-center gap-2">
              <input readOnly value={invite.link} onFocus={(e) => e.target.select()} className={`${FIELD} flex-1 text-xs`} />
              <button onClick={copy} className="px-3 py-2 rounded-lg bg-green-2 hover:bg-green-3 text-white text-xs font-bold whitespace-nowrap">{copied ? 'Copied!' : 'Copy'}</button>
              <button onClick={() => setInvite(null)} className="text-green-4/40 hover:text-green-4 text-xs font-bold">Dismiss</button>
            </div>
          </div>
        )}

        {/* Existing users */}
        <div className="space-y-2 mb-5">
          {users === null ? (
            <div className="text-sm text-green-4/40 py-4 text-center">Loading…</div>
          ) : users.length === 0 ? (
            <div className="text-sm text-green-4/40 py-4 text-center">No users yet.</div>
          ) : users.map((u) => (
            <div key={u.username} className="flex flex-wrap items-center gap-x-3 gap-y-1 border border-green-4/8 rounded-xl px-3 py-2">
              <div className="flex-1 min-w-[140px]">
                <div className="text-sm font-semibold text-green-4 truncate">
                  {u.name || u.username}
                  {u.is_admin && <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-3/15 text-orange-3 uppercase tracking-wider">Admin</span>}
                  {u.username === currentUser && <span className="ml-1 text-[10px] text-green-4/40">(you)</span>}
                </div>
                <div className="text-xs text-green-4/50 truncate">{u.username}{u.email ? ` · ${u.email}` : ''}</div>
              </div>
              <button onClick={() => sendInvite(u.username)} className="text-xs font-bold text-green-3 hover:text-green-4">Invite link</button>
              <button onClick={() => setEmailFor(u)} className="text-xs font-bold text-green-4/60 hover:text-green-4">{u.email ? 'Edit email' : 'Set email'}</button>
              <button onClick={() => reset(u.username)} className="text-xs font-bold text-green-4/60 hover:text-green-4">Set pw</button>
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
            <label className={LABEL}>Email <span className="normal-case font-normal text-green-4/40">— for approval notifications</span></label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="name@youradv.com" className={`${FIELD} w-full mt-1`} />
          </div>
          <div className="mt-2">
            <label className={LABEL}>Password <span className="normal-case font-normal text-green-4/40">— leave blank to get an invite link</span></label>
            <input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="(blank = send invite link)" className={`${FIELD} w-full mt-1`} />
          </div>
          <label className="flex items-center gap-2 mt-2 text-sm text-green-4/80">
            <input type="checkbox" checked={form.admin} onChange={(e) => setForm({ ...form, admin: e.target.checked })} />
            Admin
          </label>
          <button type="submit" disabled={busy} className="w-full mt-3 py-2 rounded-lg bg-green-2 hover:bg-green-3 disabled:opacity-50 text-white font-bold text-sm transition-colors">{busy ? 'Adding…' : 'Add user'}</button>
        </form>

        {/* Bulk add users with one default password */}
        <div className="border-t border-green-4/10 pt-4 mt-4">
          <div className="text-xs font-bold text-green-4/50 uppercase tracking-wider mb-2">Bulk add users</div>
          <label className={LABEL}>Names <span className="normal-case font-normal text-green-4/40">— one per line: full name, or username, or “username, Name, email”</span></label>
          <textarea value={bulkText} onChange={(e) => setBulkText(e.target.value)} rows={4} placeholder={'John Smith\ndana.reeves, Dana Reeves, dana@youradv.com\nmlee'} className={`${FIELD} w-full mt-1 resize-none`} />
          <div className="mt-2">
            <label className={LABEL}>Default password <span className="normal-case font-normal text-green-4/40">— applied to everyone (min 8)</span></label>
            <input type="text" value={bulkPw} onChange={(e) => setBulkPw(e.target.value)} placeholder="Shared starter password" className={`${FIELD} w-full mt-1`} />
          </div>
          <button type="button" onClick={bulkAdd} disabled={bulkBusy || !bulkText.trim() || bulkPw.length < 8} className="w-full mt-3 py-2 rounded-lg bg-green-3 hover:bg-green-4 disabled:opacity-50 text-white font-bold text-sm transition-colors">{bulkBusy ? 'Adding…' : 'Add all'}</button>
          <p className="text-[11px] text-green-4/50 mt-1">Everyone gets the same password — ask them to change it under Settings → Change password.</p>
          {bulkResult && (
            <div className="mt-2 text-xs">
              <div className="text-green-3 font-bold">{bulkResult.created.length} added{bulkResult.skipped.length ? ` · ${bulkResult.skipped.length} already existed` : ''}{bulkResult.failed.length ? ` · ${bulkResult.failed.length} failed` : ''}</div>
              {bulkResult.failed.length > 0 && <div className="mt-1 text-red-600">{bulkResult.failed.slice(0, 20).map((f, i) => <div key={i}>{f}</div>)}</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
