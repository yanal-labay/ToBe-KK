// TODO: replace with the real WhatsApp group invite link
export const WHATSAPP_GROUP_URL = '#'

export const NAV_LINKS = [
  { label: 'בית', to: '/', icon: 'home' },
  { label: 'מלגות', to: '/scholarships' },
  { label: 'אירועים', to: '/events' },
  { label: 'לוח זמנים', to: '/schedule' },
  { label: 'לוח משרות', to: '/jobs' },
  { label: 'רישום למאגר הצעירים', to: '/student-registry' },
  { label: 'בקשה לתאום פגישה', to: '/appointment' },
  { label: 'לינקים שימושיים', to: '/links' },
  { label: 'קישור לקבוצת הווצאפ', href: WHATSAPP_GROUP_URL },
  { label: 'צרו קשר', to: '/contact' },
]

// Same links as the public navbar, with admin-specific overrides:
// the home icon points back to the admin dashboard, and the registry
// link uses a shorter label that fits the admin panel's context.
export const ADMIN_NAV_LINKS = NAV_LINKS.map((link) => {
  if (link.icon === 'home') return { ...link, to: '/admin' }
  if (link.to === '/student-registry') return { ...link, label: 'מאגר צעירים' }
  return link
})
