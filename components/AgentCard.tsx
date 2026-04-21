'use client';

import Link from 'next/link';
import type { Agent } from '@/lib/supabase';

interface AgentCardProps {
  agent:     Agent;
  showChat?: boolean;
}

const departmentColors: Record<string, string> = {
  'Tech':        'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'Finance':     'bg-green-500/10 text-green-400 border-green-500/20',
  'Marketing':   'bg-purple-500/10 text-purple-400 border-purple-500/20',
  'Design':      'bg-pink-500/10 text-pink-400 border-pink-500/20',
  'Opérations':  'bg-orange-500/10 text-orange-400 border-orange-500/20',
};

const statusDot: Record<string, string> = {
  active:      'bg-green-500',
  inactive:    'bg-slate-500',
  on_mission:  'bg-yellow-500 animate-pulse',
};

export default function AgentCard({ agent, showChat = true }: AgentCardProps) {
  const deptColor = departmentColors[agent.department] ?? 'bg-slate-500/10 text-slate-400 border-slate-500/20';

  return (
    <div className="bg-[#1a2235] border border-[#1e2d4a] rounded-xl p-4 hover:border-blue-500/30 transition-all duration-200 group">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="relative">
          <div className="w-12 h-12 rounded-xl bg-[#0a0d14] border border-[#1e2d4a] flex items-center justify-center text-2xl">
            {agent.avatar}
          </div>
          <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#1a2235] ${statusDot[agent.status] ?? 'bg-slate-500'}`} />
        </div>

        {/* Infos */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-white text-sm truncate">{agent.name}</h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5 truncate">{agent.role}</p>
          <span className={`inline-block mt-2 text-xs px-2 py-0.5 rounded-full border ${deptColor}`}>
            {agent.department}
          </span>
        </div>
      </div>

      {showChat && (
        <Link
          href={`/chat/${agent.id}`}
          className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg bg-blue-600/10 text-blue-400 text-xs font-medium border border-blue-500/20 hover:bg-blue-600/20 transition-colors opacity-0 group-hover:opacity-100"
        >
          💬 Ouvrir le chat
        </Link>
      )}
    </div>
  );
}
