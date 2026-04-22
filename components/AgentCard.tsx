import Link from 'next/link';
import type { Agent } from '@/lib/supabase';

interface AgentCardProps {
  agent:     Agent;
  showChat?: boolean;
}

const DEPT_COLORS: Record<string, string> = {
  Tech:       'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Finance:    'bg-green-500/10 text-green-400 border-green-500/20',
  Marketing:  'bg-purple-500/10 text-purple-400 border-purple-500/20',
  Design:     'bg-pink-500/10 text-pink-400 border-pink-500/20',
  Opérations: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
};

const STATUS_DOT: Record<string, string> = {
  active:     'bg-green-500',
  inactive:   'bg-slate-500',
  on_mission: 'bg-yellow-500 animate-pulse',
};

export default function AgentCard({ agent, showChat = true }: AgentCardProps) {
  const deptColor = DEPT_COLORS[agent.department] ?? 'bg-slate-500/10 text-slate-400 border-slate-500/20';
  const statusDot = STATUS_DOT[agent.status] ?? 'bg-slate-500';

  const inner = (
    <div className="flex items-start gap-3 h-full">
      <div className="relative shrink-0">
        <div className="w-12 h-12 rounded-xl bg-[#0a0d14] border border-[#1e2d4a] flex items-center justify-center text-2xl">
          {agent.avatar}
        </div>
        <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#1a2235] ${statusDot}`} />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-white text-sm truncate">{agent.name}</h3>
        <p className="text-xs text-slate-400 mt-0.5 truncate">{agent.role}</p>
        <span className={`inline-block mt-2 text-xs px-2 py-0.5 rounded-full border ${deptColor}`}>
          {agent.department}
        </span>
      </div>
    </div>
  );

  if (!showChat) {
    return (
      <div className="bg-[#1a2235] border border-[#1e2d4a] rounded-xl p-4">
        {inner}
      </div>
    );
  }

  return (
    <Link
      href={`/chat/${agent.id}`}
      className="block bg-[#1a2235] border border-[#1e2d4a] rounded-xl p-4 hover:border-blue-500/40 hover:bg-[#1e2a40] transition-all duration-200 group"
    >
      {inner}
      <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-600 group-hover:text-blue-400 transition-colors">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        Ouvrir le chat
      </div>
    </Link>
  );
}
