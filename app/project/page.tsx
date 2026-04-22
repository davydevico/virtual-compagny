'use client';

import { useState, useEffect, useRef } from 'react';
import PageHeader from '@/components/PageHeader';
import LogEntry from '@/components/LogEntry';
import LogErrorBoundary from '@/components/LogErrorBoundary';
import { supabase } from '@/lib/supabase-browser';
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
  const [selectedId, setSelectedId]     = useState<string | null>(null);
  const [logs, setLogs]                 = useState<ProjectLog[]>([]);
  const [launching, setLaunching]       = useState(false);
  const [attachedFile, setAttachedFile] = useState<AttachedFile | null>(null);
  const [mobileView, setMobileView]     = useState<'form' | 'logs'>('form');
  const [fetchError, setFetchError]     = useState<string | null>(null);
  const [logCount, setLogCount]         = useState<number | null>(null);
  const [reloadTick, setReloadTick]     = useState(0);

  const logsEndRef      = useRef<HTMLDivElement>(null);
  const logsScrollRef   = useRef<HTMLDivElement>(null);
  const fileRef         = useRef<HTMLInputElement>(null);

  // Projet sélectionné, dérivé des deux states — toujours en phase
  const selected = selectedId ? projects.find(p => p.id === selectedId) ?? null : null;

  /* ═══ POLLING SANS CONCURRENCE ═══
   * setTimeout récursif : chaque appel attend la fin du précédent avant de
   * schedular le suivant → jamais deux fetchAll en parallèle.
   * Arrêt automatique dès que le projet passe en completed/paused.
   * Guard sur setProjects : on n'écrase jamais avec un tableau vide
   * (évite que selected devienne null suite à une erreur Supabase silencieuse).
   * ════════════════════════════════════════════════════════════════════════════ */
  useEffect(() => {
    if (!selectedId) return;

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    // Retourne le status du projet courant, ou null si indisponible
    const fetchAll = async (): Promise<string | null> => {
      try {
        const [logsRes, projRes] = await Promise.all([
          fetch(`/api/project/${selectedId}/logs`),
          fetch('/api/project'),
        ]);
        if (cancelled) return null;

        if (logsRes.ok) {
          try {
            const data: ProjectLog[] = await logsRes.json();
            if (cancelled) return null;
            setFetchError(null);
            setLogCount(data.length);
            setLogs(data);
          } catch {
            setFetchError(`Réponse non-JSON de l'API logs (status ${logsRes.status})`);
          }
        } else {
          setFetchError(`API logs a retourné ${logsRes.status}`);
        }

        let status: string | null = null;
        if (projRes.ok) {
          try {
            const projs: Project[] = await projRes.json();
            if (cancelled) return null;
            // Guard : on ne remplace jamais la liste par un tableau vide
            // (erreur Supabase silencieuse → selected deviendrait null)
            if (Array.isArray(projs) && projs.length > 0) {
              setProjects(projs);
              const p = projs.find(proj => proj.id === selectedId);
              if (p) status = p.status;
            }
          } catch { /* ignore */ }
        }
        return status;
      } catch (e) {
        if (!cancelled) setFetchError(`Erreur réseau : ${e instanceof Error ? e.message : String(e)}`);
        return null;
      }
    };

    const poll = async () => {
      const status = await fetchAll();
      if (cancelled) return;
      // Arrêt du polling une fois la mission terminée ou en pause
      if (status === 'completed' || status === 'paused') return;
      timeoutId = setTimeout(poll, 2500);
    };

    poll();

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  // reloadTick permet de forcer un redémarrage du polling depuis le bouton reload
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, reloadTick]);

  // Chargement initial de la liste des projets
  useEffect(() => {
    fetch('/api/project').then(r => r.ok ? r.json() : []).then(setProjects);
  }, []);

  // Auto-scroll intelligent : ne scroll que si l'utilisateur est déjà en bas (< 150px du fond)
  useEffect(() => {
    const el = logsScrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceFromBottom < 150) {
      logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Supabase Realtime — bonus, ajoute les logs en direct sans attendre le polling
  useEffect(() => {
    if (!selectedId) return;
    const channel = supabase
      .channel(`logs:${selectedId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'project_logs', filter: `project_id=eq.${selectedId}` },
        (payload) => {
          const newLog = payload.new as ProjectLog;
          setLogs(prev => prev.some(l => l.id === newLog.id) ? prev : [...prev, newLog]);
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedId]);

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
    if (!brief.trim() || launching) return;
    setLaunching(true);
    setLogs([]);

    let fullBrief = brief.trim();
    if (attachedFile) fullBrief = `${fullBrief}\n\n[Fichier joint : ${attachedFile.name}]\n\`\`\`\n${attachedFile.content}\n\`\`\``;
    setAttachedFile(null);

    try {
      const res = await fetch('/api/project', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief: fullBrief }),
      });
      if (!res.ok) { setLaunching(false); return; }

      const { projectId } = await res.json();
      setBrief('');
      setSelectedId(projectId); // → déclenche le useEffect qui fetch + polle automatiquement
      setMobileView('logs');
      setLaunching(false);

      // Fire-and-forget : l'orchestration tourne côté serveur, le polling UI se charge du reste
      fetch(`/api/project/${projectId}/run`, { method: 'POST' }).catch(() => {});
    } catch (err) {
      console.error('Erreur lancement:', err);
      setLaunching(false);
    }
  };

  const selectProject = (project: Project) => {
    if (project.id === selectedId) { setMobileView('logs'); return; }
    setSelectedId(project.id);
    setLogs([]);
    setFetchError(null);
    setLogCount(null);
    setMobileView('logs');
  };

  /* ── Sidebar content ── */
  const sidebar = (
    <div className="flex flex-col h-full">
      {/* New project form */}
      <div className="p-4 border-b border-white/5 shrink-0">
        <p className="text-xs font-bold text-white mb-3 uppercase tracking-wider">Nouvelle mission</p>
        <textarea
          value={brief}
          onChange={e => setBrief(e.target.value)}
          placeholder="Décrivez votre mission..."
          className="w-full bg-[#080b12] border border-white/8 rounded-xl p-3 text-sm text-slate-200 placeholder-slate-600 resize-none focus:outline-none focus:border-blue-500/50 transition-colors"
          rows={3}
          disabled={launching}
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
            disabled={launching}
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
          disabled={!brief.trim() || launching}
          className="mt-2.5 w-full py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {launching ? (
            <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Lancement...</>
          ) : '🚀 Lancer la mission'}
        </button>
      </div>

      {/* Project list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {projects.length === 0 && (
          <p className="text-xs text-slate-600 text-center py-6">Aucun projet pour l'instant</p>
        )}
        {projects.map(p => (
          <div
            key={p.id}
            className={`relative group rounded-xl border transition-all ${
              selected?.id === p.id
                ? 'bg-blue-600/10 border-blue-500/25'
                : 'bg-[#161b27] border-white/5 hover:border-white/12 hover:bg-[#1a2035]'
            }`}
          >
            <button
              onClick={() => selectProject(p)}
              className="w-full text-left p-3"
            >
              <div className="flex items-start justify-between gap-2 mb-1.5 pr-5">
                <span className="text-xs font-semibold text-white line-clamp-2 leading-tight">{p.title}</span>
                <StatusBadge status={p.status} />
              </div>
              <p className="text-[11px] text-slate-600">
                {new Date(p.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
              </p>
            </button>
            {/* Bouton supprimer */}
            <button
              onClick={async (e) => {
                e.stopPropagation();
                if (!confirm('Supprimer cette mission ?')) return;
                await fetch('/api/project', {
                  method: 'DELETE',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ projectId: p.id }),
                });
                if (selectedId === p.id) { setSelectedId(null); setLogs([]); }
                fetch('/api/project').then(r => r.json()).then(setProjects);
              }}
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 flex items-center justify-center rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10"
              title="Supprimer"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  /* ── Logs panel ── */
  const agentLogs    = logs.filter(l => !['Orchestrateur', 'Système', 'Davy — CEO'].includes(l.agent_name));
  const activeAgents = Array.from(new Set(agentLogs.filter(l => l.log_type === 'thinking').map(l => l.agent_name)));
  const doneAgents   = Array.from(new Set(agentLogs.filter(l => l.log_type === 'output').map(l => l.agent_name)));

  const logsPanel = selected ? (
    <>
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-3">
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
            <div className="flex items-center gap-2 shrink-0">
            <StatusBadge status={selected.status} />
            {/* Bouton reload manuel */}
            <button
              onClick={() => { setLogs([]); setFetchError(null); setLogCount(null); setReloadTick(t => t + 1); }}
              title="Recharger les logs"
              className="text-slate-600 hover:text-slate-300 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        {/* Barre de progression agents */}
        {selected.status === 'running' && agentLogs.length > 0 && (
          <div className="mt-2.5 flex items-center gap-2">
            <div className="flex-1 flex gap-1">
              {activeAgents.map(name => (
                <span key={name} className="flex items-center gap-1 text-[11px] bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-full px-2 py-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />{name}
                </span>
              ))}
              {doneAgents.map(name => (
                <span key={name} className="text-[11px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full px-2 py-0.5">
                  ✓ {name}
                </span>
              ))}
            </div>
            <span className="text-[11px] text-slate-600 tabular-nums shrink-0">{doneAgents.length}/{activeAgents.length + doneAgents.length}</span>
          </div>
        )}
      </div>

      <div ref={logsScrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">

        {/* Bandeau d'erreur API */}
        {fetchError && (
          <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-red-500/8 border border-red-500/20 text-xs text-red-400">
            <span className="shrink-0 mt-0.5">⚠️</span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold mb-0.5">Erreur de chargement</p>
              <p className="opacity-80 break-all">{fetchError}</p>
            </div>
          </div>
        )}

        {/* Info count — utile pour débug */}
        {logCount !== null && logCount === 0 && !fetchError && selected.status !== 'running' && (
          <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-amber-500/8 border border-amber-500/20 text-xs text-amber-400">
            <span className="shrink-0 mt-0.5">ℹ️</span>
            <p>L'API a répondu avec 0 log. La mission a peut-être planté côté serveur. Essayez de relancer.</p>
          </div>
        )}

        {logs.length === 0 && !fetchError && selected.status === 'running' && (
          <div className="text-center py-20">
            <div className="flex items-center justify-center gap-2 mb-3">
              <span className="w-5 h-5 border-2 border-blue-500/40 border-t-blue-400 rounded-full animate-spin" />
              <span className="text-sm text-blue-400 font-medium">Démarrage de la mission…</span>
            </div>
            <p className="text-xs text-slate-600">L'orchestrateur analyse le brief, les agents arrivent dans quelques secondes</p>
          </div>
        )}
        {logs.length === 0 && !fetchError && selected.status !== 'running' && logCount === null && (
          <div className="text-center py-20">
            <div className="text-4xl mb-3">📋</div>
            <p className="text-sm text-slate-500">Chargement des logs…</p>
          </div>
        )}

        {logs.map(log => (
          <LogErrorBoundary key={log.id}>
            <LogEntry log={log} />
          </LogErrorBoundary>
        ))}

        {/* Spinner final si encore en cours */}
        {selected.status === 'running' && logs.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-blue-500/5 border border-blue-500/10">
            <span className="w-3.5 h-3.5 border-2 border-blue-500/40 border-t-blue-400 rounded-full animate-spin shrink-0" />
            <span className="text-xs text-blue-400">Agents en cours de traitement…</span>
          </div>
        )}

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
        title="Missions"
        subtitle="Lancez une mission multi-agents et suivez l'exécution en temps réel"
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
