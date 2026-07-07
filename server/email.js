// ─────────────────────────────────────────────
// Email sender (Resend). Set RESEND_API_KEY + MAIL_FROM to enable; until then
// send() is a no-op so the app runs fine without email configured.
// ─────────────────────────────────────────────

export function emailConfigured() {
  return !!process.env.RESEND_API_KEY
}

export async function sendEmail({ to, subject, html }) {
  const key = process.env.RESEND_API_KEY
  if (!key || !to) return { delivered: false }

  const from = process.env.MAIL_FROM || 'HQ to Retail Connector <onboarding@resend.dev>'
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], subject, html }),
  })
  if (!r.ok) {
    const detail = await r.text().catch(() => '')
    throw new Error(`email send failed (${r.status}): ${detail}`)
  }
  return { delivered: true }
}
