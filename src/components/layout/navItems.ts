import { House, LayoutGrid, Music2, Shield, Thermometer } from 'lucide-react'

export const navItems = [
  { to: '/', label: 'Home', icon: House, match: 'exact' as const },
  { to: '/rooms', label: 'Rooms', icon: LayoutGrid, match: 'prefix' as const },
  { to: '/climate', label: 'Climate', icon: Thermometer, match: 'prefix' as const },
  { to: '/media', label: 'Music', icon: Music2, match: 'prefix' as const },
  { to: '/security', label: 'Security', icon: Shield, match: 'prefix' as const },
]

export function isNavActive(pathname: string, to: string, match: 'exact' | 'prefix') {
  return match === 'exact' ? pathname === to : pathname === to || pathname.startsWith(`${to}/`)
}
