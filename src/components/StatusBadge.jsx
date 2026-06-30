// Promotion lifecycle badge + promo-type pill styles. Extracted from App.jsx;
// shared by PromoCard, CalendarView, DashboardView, and AddPromoModal.

export const PROMO_TYPE_STYLES = {
  TPR: 'bg-blue-100 text-blue-800',
  Feature: 'bg-purple-100 text-purple-800',
  Display: 'bg-pink-100 text-pink-800',
  'Feature and Display': 'bg-indigo-100 text-indigo-800',
  'Feature+Display': 'bg-purple-100 text-purple-800',
  'Digital Coupon': 'bg-cyan-100 text-cyan-800',
  Shipper: 'bg-amber-100 text-amber-800',
}

export default function StatusBadge({ status }) {
  const styles = {
    active: 'bg-green-2/20 text-green-3 border border-green-2/40',
    upcoming: 'bg-orange-3/20 text-orange-3 border border-orange-3/40',
    ended: 'bg-gray-200 text-gray-500 border border-gray-300',
  }
  const dotStyles = {
    active: 'bg-green-2',
    upcoming: 'bg-orange-3',
    ended: 'bg-gray-400',
  }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${styles[status]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotStyles[status]} ${status === 'active' ? 'animate-pulse' : ''}`}/>
      {status}
    </span>
  )
}
