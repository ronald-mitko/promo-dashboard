// Status badge for submissions/requests. Colors mirror the workflag-submission
// reference: approved/delivered = green, pending = amber, rejected/failed = red.

const GREEN = ['approved', 'delivered', 'ready', 'authorized', 'completed']
const AMBER = ['submitted', 'pending', 'generating', 'assigned', 'in_progress']
const RED = ['rejected', 'failed', 'cancelled']

function classify(status) {
  if (GREEN.includes(status)) return 'bg-green-2/20 text-green-3 border border-green-2/40'
  if (AMBER.includes(status)) return 'bg-orange-3/20 text-orange-3 border border-orange-3/40'
  if (RED.includes(status)) return 'bg-red-100 text-red-600 border border-red-300'
  return 'bg-gray-200 text-gray-500 border border-gray-300' // draft / unknown
}

const LABELS = {
  in_progress: 'in progress',
}

export default function RequestStatusBadge({ status }) {
  const label = LABELS[status] || status || 'draft'
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${classify(status)}`}>
      {label}
    </span>
  )
}
