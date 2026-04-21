import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ProjectLog } from '@/lib/supabase';

interface LogEntryProps {
  log: ProjectLog;
}

const logStyles: Record<string, { border: string; bg: string; label: string; labelColor: string }> = {
  system:   { border: 'border-slate-500/30',  bg: 'bg-slate-500/5',   label: 'SYSTÈME',     labelColor: 'text-slate-400' },
  thinking: { border: 'border-yellow-500/30', bg: 'bg-yellow-500/5',  label: 'RÉFLEXION',   labelColor: 'text-yellow-400' },
  output:   { border: 'border-blue-500/30',   bg: 'bg-blue-500/5',    label: 'OUTPUT',      labelColor: 'text-blue-400' },
  success:  { border: 'border-green-500/30',  bg: 'bg-green-500/5',   label: 'SUCCÈS',      labelColor: 'text-green-400' },
  error:    { border: 'border-red-500/30',    bg: 'bg-red-500/5',     label: 'ERREUR',      labelColor: 'text-red-400' },
};

export default function LogEntry({ log }: LogEntryProps) {
  const style = logStyles[log.log_type] ?? logStyles.output;
  const time  = new Date(log.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div className={`rounded-lg border ${style.border} ${style.bg} p-4 animate-fade-in`}>
      <div className="flex items-center gap-2 mb-2">
        <span className={`text-xs font-mono font-bold ${style.labelColor}`}>[{style.label}]</span>
        <span className="text-sm font-medium text-white">{log.agent_name}</span>
        <span className="text-xs text-slate-500 ml-auto font-mono">{time}</span>
      </div>
      <div className="prose-dark text-sm text-slate-300">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {log.message}
        </ReactMarkdown>
      </div>
    </div>
  );
}
