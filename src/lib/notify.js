// Fire-and-forget approval-workflow email notifications. No-op offline; never
// throws (a failed notification must not block the submit/approve/reject action).
import { apiEnabled } from './api'

export function notify(event, payload = {}) {
  if (!apiEnabled()) return
  try {
    fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, ...payload }),
    }).catch(() => {})
  } catch { /* best-effort */ }
}
