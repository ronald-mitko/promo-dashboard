// POST /api/notify — send approval-workflow emails.
//   { event:'submitted',  routedRcsmId, itemLabel, submitterName }   → email the RCSM
//   { event:'approved'|'rejected', submitterEmail, itemLabel, note } → email the submitter
// Recipients are resolved from trusted server state (RCSM directory) or the
// submitter email stamped on the record. Best-effort: never blocks the action.
import { getSession, authConfigured, baseUrl } from '../server/auth.js'
import { getConfig } from '../server/pg.js'
import { sendEmail } from '../server/email.js'

const esc = (s) => String(s ?? '').replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]))

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!authConfigured()) return res.status(200).json({ ok: true, skipped: 'auth-not-configured' })
  const session = getSession(req)
  if (!session) return res.status(401).json({ error: 'Authentication required' })

  try {
    const { event, itemLabel, note, routedRcsmId, submitterEmail, submitterName } = req.body || {}
    const label = esc(itemLabel || 'a submission')
    const app = baseUrl(req)
    const openLink = `<p><a href="${app}/">Open HQ to Retail Connector</a></p>`
    let to, subject, html

    if (event === 'submitted') {
      const rcsms = (await getConfig('rcsms')) || []
      const rcsm = Array.isArray(rcsms) ? rcsms.find((r) => r.rcsmId === routedRcsmId) : null
      to = rcsm && rcsm.email
      subject = `Approval needed: ${itemLabel || 'new submission'}`
      html = `<p>${esc(submitterName || session.name || 'HQ')} submitted <strong>${label}</strong> for your approval.</p>${openLink}`
    } else if (event === 'approved' || event === 'rejected') {
      to = submitterEmail
      const verb = event === 'approved' ? 'approved' : 'denied'
      subject = `Your submission was ${verb}${itemLabel ? `: ${itemLabel}` : ''}`
      html = `<p>Your submission <strong>${label}</strong> was <strong>${verb}</strong> by ${esc(session.name || 'the RCSM')}.</p>`
        + (event === 'rejected' && note ? `<p><strong>Reason:</strong> ${esc(note)}</p>` : '')
        + openLink
    } else {
      return res.status(400).json({ error: 'unknown event' })
    }

    if (!to) return res.status(200).json({ ok: true, delivered: false, reason: 'no recipient email' })
    const result = await sendEmail({ to, subject, html })
    return res.status(200).json({ ok: true, delivered: !!result.delivered })
  } catch (err) {
    return res.status(500).json({ error: String(err.message || err) })
  }
}
