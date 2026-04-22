'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

const nav = [
  { href: '/dashboard', label: 'Dashboard',   icon: 'grid' },
  { href: '/recruit',   label: 'Recrutement', icon: 'users' },
  { href: '/project',   label: 'Projets',     icon: 'rocket' },
];

function Icon({ name, className = 'w-5 h-5' }: { name: string; className?: string }) {
  const icons: Record<string, React.ReactNode> = {
    grid: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
    users: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" /><path strokeLinecap="round" strokeLinejoin="round" d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
    rocket: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09zM15 9l-6 6" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.84 4.61a5.5 5.5 0 00-7.78 0L11 6.67l-2 2 1.5 1.5 2-2 2.06-2.06a3.5 3.5 0 014.95 4.95L17.45 13l-2 2 1.5 1.5 2-2 2.06-2.06a5.5 5.5 0 000-7.83z" />
      </svg>
    ),
    menu: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    ),
    x: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
  };
  return <>{icons[name] ?? null}</>;
}

export default function Sidebar() {
  const pathname  = usePathname();
  const [open, setOpen] = useState(false);

  // Fermer le drawer quand on change de page
  useEffect(() => { setOpen(false); }, [pathname]);

  // Bloquer le scroll body quand le drawer est ouvert
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="p-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-base shadow-lg shadow-blue-500/20">
            S
          </div>
          <div>
            <div className="font-bold text-white text-sm tracking-wider">SURGIFLOW</div>
            <div className="text-xs text-slate-500 font-medium">Company OS</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5">
        <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest px-3 py-2">Navigation</p>
        {nav.map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group ${
                active
                  ? 'bg-blue-600/15 text-blue-400 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span className={`transition-colors ${active ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'}`}>
                <Icon name={item.icon} className="w-[18px] h-[18px]" />
              </span>
              {item.label}
              {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400" />}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-white/5">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-xs font-bold text-white shadow">
            D
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-white">Davy</div>
            <div className="text-xs text-slate-500">CEO · Fondateur</div>
          </div>
          <div className="w-2 h-2 rounded-full bg-green-400 shadow-sm shadow-green-400/50" />
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* ── DESKTOP sidebar ── */}
      <aside className="hidden md:flex w-60 h-screen sticky top-0 bg-[#0d1117] border-r border-white/5 flex-col shrink-0">
        {sidebarContent}
      </aside>

      {/* ── MOBILE top bar ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 h-14 bg-[#0d1117]/95 backdrop-blur-sm border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-xs">
            S
          </div>
          <span className="font-bold text-white text-sm tracking-wide">SURGIFLOW</span>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <Icon name="menu" className="w-5 h-5" />
        </button>
      </div>

      {/* ── MOBILE drawer overlay ── */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── MOBILE drawer ── */}
      <aside className={`md:hidden fixed top-0 left-0 bottom-0 z-50 w-72 bg-[#0d1117] border-r border-white/5 flex flex-col transition-transform duration-300 ease-out ${
        open ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-xs">S</div>
            <span className="font-bold text-white text-sm">SURGIFLOW</span>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-400"
          >
            <Icon name="x" className="w-4 h-4" />
          </button>
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          {nav.map(item => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all ${
                  active ? 'bg-blue-600/15 text-blue-400' : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon name={item.icon} className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-white/5">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-xs font-bold text-white">D</div>
            <div>
              <div className="text-xs font-semibold text-white">Davy — CEO</div>
              <div className="text-xs text-slate-500">En ligne</div>
            </div>
            <div className="ml-auto w-2 h-2 rounded-full bg-green-400" />
          </div>
        </div>
      </aside>
    </>
  );
}
