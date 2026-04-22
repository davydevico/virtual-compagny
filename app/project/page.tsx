'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import PageHeader from '@/components/PageHeader';
import LogEntry from '@/components/LogEntry';
import type { Project, ProjectLog } from '@/lib/supabase';

const TEXT_EXTENSIONS = /\.(txt|md|csv|json|ts|tsx|js|jsx|py|sql|html|css|xml|yaml|yml|sh)$/i;

interface AttachedFile { name: string; content: string; }

const STATUS_MAP: Record<string, { label: string; classes: string; dot: string }> = {
  running:   { label: 'En cours', classes: 'bg-amber-500/10 text-amber-400 border-amber-500/20',    dot: 'bg-amber-400 animate-pulse' },
  completed: { label: 'Terminé',  classes: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', dot: 'bg-emerald-400' },
  paused:    { label: 'Pause',    classes: 'bg-slate-500/10 text-slate-400 border-slate-500/20',     dot: 'bg-slate-400' },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] ?? STATUS_MAP.paused;
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${s.classes}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

export default function ProjectPage() {
  const [brief, setBrief]               = useState('');
  const [projects, setProjects]         = useState<Project[]>([]);
  const [selected, setSelected]         = useState<Project | null>(null);
  const [logs, setLogs]                 = useState<ProjectLog[]>([]);
  const [running, setRunning]           = useState(false);
  const [polling, setPolling]           = useState(false);
  const [attachedFile, setAttachedFile] = useState<AttachedFile | null>(null);
  const [mobileView, setMobileView]     = useState<'form' | 'logs'>('form');

  const logsEndRef = useRef<HTMLDivElement>(null);
  const pollRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileRef    = useRef<HTMLInputElement>(null);

  const fetchProjects = useCallback(async () => {
    const res = await fetch('/api/project');
    if (res.ok) setProjects(await res.json());
  }, []);

  const fetchLogs = useCallback(async (projectId: string) => {
    const res = await fetch(`/api/project/${projectId}/logs`);
    if (res.ok) {
      const data = await res.json();
      setLogs(data);
      // Arrêter le polling si un log de succès ou d'erreur finale est présent
      const lastLog = data[data.length - 1];
      if (lastLog?.log_type === 'success' || lastLog?.agent_name === 'Système' && lastLog?.log_type === 'error') {
        setPolling(false);
        setRunning(false);
        fetchProjects();
      }
    }
  }, []);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);
  useEffect(() => { logsEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [logs]);

  useEffect(() => {
    if (polling && selected) {
      pollRef.current = setInterval(() => fetchLogs(selected.id), 800);
    } else {
      if (pollRef.current) clearInterval(pollRef.current);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [polling, selected, fetchLogs]);

  useEffect(() => {
    if (running && selected) setPolling(true);
  }, [running, selected]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!TEXT_EXTENSIONS.test(file.name) && !file.type.startsWith('text/')) {
      alert('Format non supporté. Utilisez : .txt, .md, .csv, .json, .ts, .js, .py, .sql...');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.readAsText(file);
    reader.onload = () => setAttachedFile({ name: file.name, content: reader.result as string });
    e.target.value = '';
  };

  const launchProject = async () => {
    if (!brief.trim() || running) return;
    setRunning(true);
    setLogs([]);

    let fullBrief = brief.trim();
    if (attachedFile) fullBrief = `${fullBrief}\n\n[Fichier joint : ${attachedFile.name}]\n\`\`\`\n${attachedFile.content}\n\`\`\``;
    setAttachedFile(null);

    try {
      // 1. Créer le projet (rapide)
      const res  = await fetch('/api/project', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief: fullBrief }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Erreur serveur' }));
        console.error('Erreur création projet:', err);
        setRunning(false);
        return;
      }

      const { projectId } = await res.json();

      // 2. Récupérer et afficher le projet immédiatement
      await fetchProjects();
      const allRes      = await fetch('/api/project');
      const allProjects: Project[] = await allRes.json();
      const newProject  = allProjects.find(p => p.id === projectId) ?? allProjects[0];
      if (newProject) {
        setSelected(newProject);
        await fetchLogs(newProject.id);
        setMobileView('logs');
        setPolling(true);
      }
      setBrief('');

      // 3. Déclencher l'orchestration avec un timeout de sécurité côté client (3 min)
      const controller  = new AbortController();
      const safeTimeout = setTimeout(() => controller.abort(), 3 * 60 * 1000);

      const finishRun = async () => {
        clearTimeout(safeTimeout);
        setRunning(false);
        setPolling(false);

        // Si le projet est encore "running" (timeout Netlify), on le marque paused
        const checkRes = await fetch('/api/project');
        if (checkRes.ok) {
          const all: Project[] = await checkRes.json();
          const proj = all.find(p => p.id === projectId);
          if (proj?.status === 'running') {
            await fetch('/api/project', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ projectId, status: 'paused' }),
            });
          }
        }

        await fetchProjects();
        if (projectId) {
          const finalLogs = await fetch(`/api/project/${projectId}/logs`);
          if (finalLogs.ok) setLogs(await finalLogs.json());
        }
      };

      fetch(`/api/project/${projectId}/run`, { method: 'POST', signal: controller.signal })
        .catch(() => {}) // timeout ou erreur réseau → on gère dans finally
        .finally(finishRun);

    } catch (err) {
      console.error('Erreur lancement:', err);
      setRunning(false);
      setPolling(false);
    }
  };

  const selectProject = async (project: Project) => {
    setSelected(project);
    await fetchLogs(project.id);
    setPolling(false);
    setMobileView('logs');
  };

  /* ── Sidebar content ── */
  const sidebar = (
    <div className="flex flex-col h-full">
      {/* New project form */}
      <div className="p-4 border-b border-white/5 shrink-0">
        <p className="text-xs font-bold text-white mb-3 uppercase tracking-wider">Nouveau projet</p>
        <textarea
          value={brief}
          onChange={e => setBrief(e.target.value)}
          placeholder="Décrivez votre mission..."
          className="w-full bg-[#080b12] border border-white/8 rounded-xl p-3 text-sm text-slate-200 placeholder-slate-600 resize-none focus:outline-none focus:border-blue-500/50 transition-colors"
          rows={3}
          disabled={running}
        />

        {/* File */}
        <input ref={fileRef} type="file"
          accept=".txt,.md,.csv,.json,.ts,.tsx,.js,.jsx,.py,.sql,.html,.css,.xml,.yaml,.yml,.sh"
          className="hidden" onChange={handleFileSelect}
        />
        {attachedFile ? (
          <div className="mt-2 flex items-center gap-2 bg-[#080b12] border border-white/8 rounded-xl px-3 py-2">
            <span>📄</span>
            <span className="text-xs text-slate-300 flex-1 truncate">{attachedFile.name}</span>
            <button onClick={() => setAttachedFile(null)} className="text-slate-500 hover:text-red-400 transition-colors text-xs">✕</button>
          </div>
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            disabled={running}
            className="mt-2 w-full py-2 rounded-xl border border-dashed border-white/8 text-xs text-slate-600 hover:border-blue-500/30 hover:text-blue-400 transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
            Joindre un fichier
          </button>
        )}

        <button
          onClick={launchProject}
          disabled={!brief.trim() || running}
          className="mt-2.5 w-full py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {running ? (
            <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />En cours...</>
          ) : '🚀 Lancer le projet'}
        </button>
      </div>

      {/* Project list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {projects.length === 0 && (
          <p className="text-xs text-slate-600 text-center py-6">Aucun projet pour l'instant</p>
        )}
        {projects.map(p => (
          <button
            key={p.id}
            onClick={() => selectProject(p)}
            className={`w-full text-left rounded-xl border p-3 transition-all ${
              selected?.id === p.id
                ? 'bg-blue-600/10 border-blue-500/25'
                : 'bg-[#161b27] border-white/5 hover:border-white/12 hover:bg-[#1a2035]'
            }`}
          >
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <span className="text-xs font-semibold text-white line-clamp-2 leading-tight">{p.title}</span>
              <StatusBadge status={p.status} />
            </div>
            <p className="text-[11px] text-slate-600">
              {new Date(p.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
            </p>
          </button>
        ))}
      </div>
    </div>
  );

  /* ── Logs panel ── */
  const logsPanel = selected ? (
    <>
      <div className="px-4 py-3 border-b border-white/5 flex items-center gap-3 shrink-0">
        <button
          onClick={() => setMobileView('form')}
          className="md:hidden text-slate-400 hover:text-white transition-colors mr-1"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white truncate">{selected.title}</p>
          <p className="text-xs text-slate-500 truncate mt-0.5">{selected.brief.slice(0, 80)}{selected.brief.length > 80 ? '…' : ''}</p>
        </div>
        <StatusBadge status={selected.status} />
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
        {logs.length === 0 && (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">📋</div>
            <p className="text-sm text-slate-500">Aucun log pour ce projet</p>
          </div>
        )}
        {logs.map(log => <LogEntry key={log.id} log={log} />)}
        <div ref={logsEndRef} />
      </div>
    </>
  ) : (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center">
        <div className="text-5xl mb-4">🚀</div>
        <h3 className="text-base font-bold text-white mb-2">Lancez votre premier projet</h3>
        <p className="text-sm text-slate-500">Écrivez un brief et vos agents IA collaboreront en temps réel</p>
        <button
          onClick={() => setMobileView('form')}
          className="md:hidden mt-4 px-4 py-2 rounded-xl bg-blue-600/15 text-blue-400 text-sm font-semibold border border-blue-500/20"
        >
          ← Créer un projet
        </button>
      </div>
    </div>
  );

  return (
    <div className="h-screen flex flex-col">
      <PageHeader
        title="Projets"
        subtitle="Lancez un projet multi-agents et suivez l'exécution en temps réel"
        icon="🚀"
      />

      {/* Desktop: side by side | Mobile: tab switching */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar — hidden on mobile when viewing logs */}
        <div className={`${mobileView === 'logs' ? 'hidden' : 'flex'} md:flex flex-col w-full md:w-72 lg:w-80 border-r border-white/5 shrink-0`}>
          {sidebar}
        </div>

        {/* Logs panel — hidden on mobile when viewing form */}
        <div className={`${mobileView === 'form' ? 'hidden' : 'flex'} md:flex flex-col flex-1 overflow-hidden`}>
          {logsPanel}
        </div>
      </div>
    </div>
  );
}
