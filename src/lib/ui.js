// ─────────────────────────────────────────────
// Shared Tailwind class tokens for form controls — single source of truth for
// the input/select/textarea and label styling repeated across the app.
//
// NOTE: the order of utilities within a className has no effect on the rendered
// CSS (each utility is its own rule; conflicts resolve by stylesheet order, not
// attribute order). So callers may freely append extras, e.g.
//   `${FIELD} placeholder:text-green-4/30`      (text inputs)
//   `${FIELD} disabled:opacity-50`              (disabled selects)
//   `${FIELD} appearance-none`                  (custom-chevron selects)
//   `${FIELD} placeholder:text-green-4/30 resize-none`  (textareas)
// ─────────────────────────────────────────────

export const LABEL = 'text-xs font-semibold text-green-4/60 uppercase tracking-wider'

export const FIELD = 'bg-white border border-green-4/15 rounded-lg px-3 py-2 text-sm text-green-4 font-medium focus:outline-none focus:ring-2 focus:ring-green-2/40 focus:border-green-2 transition-all'
