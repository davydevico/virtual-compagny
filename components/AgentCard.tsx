import Link from 'next/link';
import type { Agent } from '@/lib/supabase';

interface AgentCardProps {
  agent:     Agent;
  showChat?: boolean;
}

const DEPT_STYLES: Record<string, { badge: string; glow: string }> = {
  Tech:       { badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20',   glow: 'hover:border-blue-500/30 hover:shadow-blue-500/5' },
  Finance:    { badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', glow: 'hover:border-emerald-500/30 hover:shadow-emerald-500/5' },
  Marketing:  { badge: 'bg-violet-500/10 text-violet-400 border-violet-500/20', glow: 'hover:border-violet-500/30 hover:shadow-violet-500/5' },
  Design:     { badge: 'bg-pink-500/10 text-pink-400 border-pink-500/20',    glow: 'hover:border-pink-500/30 hover:shadow-pink-500/5' },
  Opérations: { badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20', glow: 'hover:border-amber-500/30 hover:shadow-amber-500/5' },
};

const STATUS_CONFIG: Record<string, { dot: string; label: string }> = {
  active:     { dot: 'bg-emerald-400 shadow-emerald-400/50',  label: 'Actif' },
  inactive:   { dot: 'bg-slate-500',                           label: 'Inactif' },
  on_mission: { dot: 'bg-amber-400 animate-pulse shadow-amber-400/50', label: 'En mission' },
};

export default function AgentCard({ agent, showChat = true }: AgentCardProps) {
  const dept   = DEPT_STYLES[agent.department] ?? { badge: 'bg-slate-500/10 text-slate-400 border-slate-500/20', glow: '' };
  const status = STATUS_CONFIG[agent.status] ?? STATUS_CONFIG.inactive;

  const card = (
    <div className="flex flex-col h-full">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="relative shrink-0">
          <div className="w-11 h-11 rounded-2xl bg-[#0a0e1a] border border-white/8 flex items-center justify-center text-2xl shadow-inner">
            {agent.avatar}
          </div>
          <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#161b27] shadow-sm ${status.dot}`} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 pt-0.5">
          <p className="text-sm font-semibold text-white truncate leading-tight">{agent.name}</p>
          <p className="text-xs text-slate-400 mt-0.5 truncate">{agent.role}</p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${dept.badge}`}>
          {agent.department}
        </span>
        {showChat && (
          <span className="text-[11px] text-slate-600 group-hover:text-blue-400 transition-colors flex items-center gap-1">
            Chat
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </span>
        )}
      </div>
    </div>
  );

  if (!showChat) {
    return (
      <div className="bg-[#161b27] border border-white/6 rounded-2xl p-4">
        {card}
      </div>
    );
  }

  return (
    <Link
      href={`/chat/${agent.id}`}
      className={`group block bg-[#161b27] border border-white/6 rounded-2xl p-4 transition-all duration-200 hover:bg-[#1a2035] hover:shadow-lg ${dept.glow}`}
    >
      {card}
    </Link>
  );
}
