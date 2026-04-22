'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { avatarUrl } from '@/lib/avatar';
import type { ProjectLog } from '@/lib/supabase';

interface EnrichedLog extends ProjectLog {
  agents?: { role: string; department: string } | null;
}

const DEPT_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  Tech:        { text: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20' },
  Finance:     { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  Marketing:   { text: 'text-violet-400',  bg: 'bg-violet-500/10',  border: 'border-violet-500/20' },
  Design:      { text: 'text-pink-400',    bg: 'bg-pink-500/10',    border: 'border-pink-500/20' },
  Opérations:  { text: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20' },
};

const SYSTEM_AGENTS = new Set(['Orchestrateur', 'Système', 'Davy — CEO']);

// ─── Ligne système (orchestrateur, CEO, succès, erreur) ──────────────────────
function SystemLine({ log }: { log: EnrichedLog }) {
  const isSuccess = log.log_type === 'success';
  const isError   = log.log_type === 'error';
  const time = new Date(log.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className={`flex items-start gap-2.5 px-3 py-2 rounded-xl text-xs ${
      isSuccess ? 'bg-emerald-500/8 border border-emerald-500/15 text-emerald-400' :
      isError   ? 'bg-red-500/8 border border-red-500/15 text-red-400' :
      'text-slate-500'
    }`}>
      <span className="shrink-0 mt-0.5">
        {isSuccess ? '✅' : isError ? '❌' : '⚙️'}
      </span>
      <span className="flex-1">{log.message}</span>
      <span className="tabular-nums font-mono text-[10px] opacity-60 shrink-0">{time}</span>
    </div>
  );
}

// ─── Carte agent (thinking ou output) ────────────────────────────────────────
function AgentCard({ log }: { log: EnrichedLog }) {
  const [expanded, setExpanded] = useState(false);
  const isThinking = log.log_type === 'thinking';
  const dept       = log.agents?.department ?? '';
  const role       = log.agents?.role ?? '';
  const colors     = DEPT_COLORS[dept] ?? { text: 'text-slate-400', bg: 'bg-white/5', border: 'border-white/8' };
  const time = new Date(log.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  const rawMessage = log.message ?? '';
  const TRUNCATE = 600;
  const isLong   = rawMessage.length > TRUNCATE;

  // Coupe au dernier saut de ligne ou espace avant la limite — jamais en plein milieu d'un mot/tag markdown
  const cutPoint = (() => {
    if (!isLong || expanded) return rawMessage.length;
    const candidate = rawMessage.slice(0, TRUNCATE);
    const lastNewline = candidate.lastIndexOf('\n');
    const lastSpace   = candidate.lastIndexOf(' ');
    return lastNewline > TRUNCATE - 80 ? lastNewline : lastSpace > TRUNCATE - 40 ? lastSpace : TRUNCATE;
  })();
  const displayed = expanded ? rawMessage : rawMessage.slice(0, cutPoint) + (isLong ? '\n\n…' : '');

  return (
    <div className={`rounded-2xl border ${colors.border} ${colors.bg} overflow-hidden`}>
      {/* Header agent */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
        <div className="relative shrink-0">
          { /* eslint-disable-next-line @next/next/no-img-element */ }
          <img
            src={avatarUrl(log.agent_name, 40)}
            alt={log.agent_name}
            width={36}
            height={36}
            className="rounded-full object-cover w-9 h-9"
          />
          {/* Indicateur état */}
          <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0d1117] ${
            isThinking ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'
          }`} />
        </div>

        <div className="flex-1 min-w-0">
          <p className={`text-sm font-bold ${colors.text}`}>{log.agent_name}</p>
          {role && <p className="text-[11px] text-slate-500 truncate">{role}</p>}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isThinking ? (
            <span className="flex items-center gap-1.5 text-[11px] text-amber-400 font-medium">
              <span className="w-3 h-3 border border-amber-400/60 border-t-amber-400 rounded-full animate-spin" />
              En cours…
            </span>
          ) : (
            <span className="text-[11px] text-emerald-400 font-medium">✓ Livré</span>
          )}
          <span className="text-[10px] text-slate-600 font-mono tabular-nums">{time}</span>
        </div>
      </div>

      {/* Corps du message */}
      {!isThinking && (
        <div className="px-4 py-3">
          <div className="prose-dark text-sm text-slate-300 leading-relaxed">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{displayed}</ReactMarkdown>
          </div>
          {isLong && (
            <button
              onClick={() => setExpanded(e => !e)}
              className={`mt-2 text-xs font-semibold ${colors.text} hover:opacity-80 transition-opacity`}
            >
              {expanded ? '▲ Réduire' : `▼ Voir la suite (${Math.round(rawMessage.length / 100) * 100}+ chars)`}
            </button>
          )}
        </div>
      )}

      {/* Tâche assignée (thinking) */}
      {isThinking && (
        <div className="px-4 py-3 text-xs text-slate-500 italic">
          {rawMessage.replace('Traitement : ', '')}
        </div>
      )}
    </div>
  );
}

// ─── Export principal ─────────────────────────────────────────────────────────
export default function LogEntry({ log }: { log: EnrichedLog }) {
  if (SYSTEM_AGENTS.has(log.agent_name)) return <SystemLine log={log} />;
  return <AgentCard log={log} />;
}
