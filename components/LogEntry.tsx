import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ProjectLog } from '@/lib/supabase';

const LOG_CONFIG: Record<string, { border: string; bg: string; dot: string; label: string; labelColor: string }> = {
  system:   { border: 'border-slate-700/50',  bg: 'bg-slate-800/20',  dot: 'bg-slate-500',   label: 'SYSTÈME',   labelColor: 'text-slate-400' },
  thinking: { border: 'border-amber-500/20',  bg: 'bg-amber-500/5',   dot: 'bg-amber-400',   label: 'RÉFLEXION', labelColor: 'text-amber-400' },
  output:   { border: 'border-blue-500/20',   bg: 'bg-blue-500/5',    dot: 'bg-blue-400',    label: 'OUTPUT',    labelColor: 'text-blue-400' },
  success:  { border: 'border-emerald-500/20',bg: 'bg-emerald-500/5', dot: 'bg-emerald-400', label: 'SUCCÈS',    labelColor: 'text-emerald-400' },
  error:    { border: 'border-red-500/20',    bg: 'bg-red-500/5',     dot: 'bg-red-400',     label: 'ERREUR',    labelColor: 'text-red-400' },
};

export default function LogEntry({ log }: { log: ProjectLog }) {
  const cfg  = LOG_CONFIG[log.log_type] ?? LOG_CONFIG.output;
  const time = new Date(log.created_at).toLocaleTimeString('fr-FR', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });

  return (
    <div className={`rounded-xl border ${cfg.border} ${cfg.bg} p-3 md:p-4 animate-fade-in`}>
      <div className="flex items-center gap-2 mb-2 flex-wrap gap-y-1">
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
        <span className={`text-[10px] font-bold tracking-widest uppercase ${cfg.labelColor}`}>{cfg.label}</span>
        <span className="text-xs font-semibold text-white">{log.agent_name}</span>
        <span className="text-[11px] text-slate-600 ml-auto font-mono tabular-nums">{time}</span>
      </div>
      <div className="prose-dark text-sm text-slate-300 pl-3.5">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{log.message}</ReactMarkdown>
      </div>
    </div>
  );
}
