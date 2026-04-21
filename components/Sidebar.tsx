'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const nav = [
  { href: '/dashboard', label: 'Dashboard',     icon: '🏢' },
  { href: '/recruit',   label: 'Recrutement',   icon: '👥' },
  { href: '/project',   label: 'Projets',        icon: '🚀' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 min-h-screen bg-[#111827] border-r border-[#1e2d4a] flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-[#1e2d4a]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-lg font-bold">
            S
          </div>
          <div>
            <div className="font-bold text-white text-sm tracking-wide">SURGIFLOW</div>
            <div className="text-xs text-slate-400">Company OS</div>
          </div>
        </div>
      </div>

      {/* Navigation principale */}
      <nav className="flex-1 p-4 space-y-1">
        {nav.map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors
                ${active
                  ? 'bg-blue-600/20 text-blue-400 font-medium'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }
              `}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-[#1e2d4a]">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white">
            D
          </div>
          <div>
            <div className="text-xs font-medium text-white">Davy</div>
            <div className="text-xs text-slate-500">CEO</div>
          </div>
          <div className="ml-auto w-2 h-2 rounded-full bg-green-500" />
        </div>
      </div>
    </aside>
  );
}
