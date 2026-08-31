// TODO: replace with the real WhatsApp group invite link
export const WHATSAPP_GROUP_URL = 'https://chat.whatsapp.com/KbEjLXZ5pxQKypZaEZcjhW'

/**
 * The public site's navbar links, rendered by <Navbar/> when the visitor is
 * not an authenticated admin. Each entry is either `{label, to}` (an
 * internal route via NavLink) or `{label, href}` (an external link, opened
 * in a new tab). The entry with `icon: 'home'` renders as an icon instead of
 * text (see Navbar.jsx).
 */
export const NAV_LINKS = [
  { label: 'בית', to: '/', icon: 'home' },
  { label: 'מלגות', to: '/scholarships' },
  { label: 'אירועים', to: '/events' },
  { label: 'לוח זמנים', to: '/schedule' },
  { label: 'לוח משרות', to: '/jobs' },
  { label: 'רישום למאגר הצעירים', to: '/student-registry' },
  { label: 'לינקים שימושיים', to: '/links' },
  { label: 'קישור לקבוצת הווצאפ', href: WHATSAPP_GROUP_URL },
  { label: 'צרו קשר', to: '/contact' },
]

// Same links as the public navbar, with one admin-specific override: the
// registry link uses a shorter label that fits the admin panel's context.
// The home icon stays pointed at "/" for admins too — there's no separate
// admin dashboard route anymore (see App.jsx).
export const ADMIN_NAV_LINKS = [
  ...NAV_LINKS.map((link) => {
    if (link.to === '/student-registry') return { ...link, label: 'מאגר צעירים' }
    return link
  }),
  // Admin-only page, so it's appended here rather than mapped from
  // NAV_LINKS — the first entry the two lists genuinely don't share.
  { label: 'סטטיסטיקות', to: '/admin/activity' },
]
