'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import PageHeader from '@/components/PageHeader';
import LogEntry from '@/components/LogEntry';
import type { Project, ProjectLog } from '@/lib/supabase';

export default function ProjectPage() {
  const [brief, setBrief]         = useState('');
  const [projects, setProjects]   = useState<Project[]>([]);
  const [selected, setSelected]   = useState<Project | null>(null);
  const [logs, setLogs]           = useState<ProjectLog[]>([]);
  const [running, setRunning]     = useState(false);
  const [polling, setPolling]     = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const pollRef    = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchProjects = useCallback(async () => {
    const res = await fetch('/api/project');
    if (res.ok) setProjects(await res.json());
  }, []);

  const fetchLogs = useCallback(async (projectId: string) => {
    const res = await fetch(`/api/project/${projectId}/logs`);
    if (res.ok) setLogs(await res.json());
  }, []);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Polling des logs pendant l'exécution
  useEffect(() => {
    if (polling && selected) {
      pollRef.current = setInterval(() => fetchLogs(selected.id), 1500);
    } else {
      if (pollRef.current) clearInterval(pollRef.current);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [polling, selected, fetchLogs]);

  const launchProject = async () => {
    if (!brief.trim() || running) return;
    setRunning(true);
    setLogs([]);

    try {
      const res = await fetch('/api/project', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ brief }),
      });
      const data = await res.json();

      if (res.ok) {
        // Récupérer le projet créé et afficher ses logs
        await fetchProjects();
        const projectsRes = await fetch('/api/project');
        const allProjects: Project[] = await projectsRes.json();
        const newProject = allProjects.find(p => p.id === data.projectId) ?? allProjects[0];
        if (newProject) {
          setSelected(newProject);
          await fetchLogs(newProject.id);
        }
        setBrief('');
      }
    } finally {
      setRunning(false);
      setPolling(false);
    }
  };

  const selectProject = async (project: Project) => {
    setSelected(project);
    await fetchLogs(project.id);
    setPolling(false);
  };

  // Démarrer le polling quand on lance
  useEffect(() => {
    if (running && selected) setPolling(true);
  }, [running, selected]);

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      running:   'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
      completed: 'bg-green-500/10 text-green-400 border-green-500/20',
      paused:    'bg-slate-500/10 text-slate-400 border-slate-500/20',
    };
    const labels: Record<string, string> = {
      running: 'En cours', completed: 'Terminé', paused: 'Pause',
    };
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full border ${map[status] ?? map.paused}`}>
        {labels[status] ?? status}
      </span>
    );
  };

  return (
    <div className="min-h-screen flex flex-col">
      <PageHeader
        title="Projets"
        subtitle="Lancez un projet multi-agents et suivez l'exécution en temps réel"
        icon="🚀"
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Colonne gauche : liste des projets + formulaire */}
        <div className="w-80 border-r border-[#1e2d4a] flex flex-col">
          {/* Formulaire nouveau projet */}
          <div className="p-4 border-b border-[#1e2d4a]">
            <h3 className="text-sm font-semibold text-white mb-3">Nouveau projet</h3>
            <textarea
              value={brief}
              onChange={e => setBrief(e.target.value)}
              placeholder="Décrivez votre mission en une ou deux phrases..."
              className="w-full bg-[#0a0d14] border border-[#1e2d4a] rounded-lg p-3 text-sm text-slate-200 placeholder-slate-600 resize-none focus:outline-none focus:border-blue-500/50 transition-colors"
              rows={3}
              disabled={running}
            />
            <button
              onClick={launchProject}
              disabled={!brief.trim() || running}
              className="mt-2 w-full py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {running ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Orchestration en cours...
                </>
              ) : (
                '🚀 Lancer le projet'
              )}
            </button>
          </div>

          {/* Liste des projets */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {projects.length === 0 && (
              <p className="text-xs text-slate-500 text-center py-4">Aucun projet pour l'instant</p>
            )}
            {projects.map(p => (
              <button
                key={p.id}
                onClick={() => selectProject(p)}
                className={`w-full text-left rounded-lg border p-3 transition-all ${
                  selected?.id === p.id
                    ? 'bg-blue-600/10 border-blue-500/30'
                    : 'bg-[#1a2235] border-[#1e2d4a] hover:border-blue-500/20'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="text-xs font-medium text-white line-clamp-2">{p.title}</span>
                  {statusBadge(p.status)}
                </div>
                <p className="text-xs text-slate-500">
                  {new Date(p.created_at).toLocaleDateString('fr-FR', {
                    day: 'numeric', month: 'short',
                  })}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Colonne droite : logs */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selected ? (
            <>
              <div className="p-4 border-b border-[#1e2d4a] flex items-center gap-3">
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-white">{selected.title}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{selected.brief}</p>
                </div>
                {statusBadge(selected.status)}
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {logs.length === 0 && (
                  <div className="text-center py-12">
                    <div className="text-3xl mb-2">📋</div>
                    <p className="text-sm text-slate-400">Aucun log pour ce projet</p>
                  </div>
                )}
                {logs.map(log => <LogEntry key={log.id} log={log} />)}
                <div ref={logsEndRef} />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="text-5xl mb-4">🚀</div>
                <h3 className="text-lg font-medium text-white mb-2">Lancez votre premier projet</h3>
                <p className="text-sm text-slate-400">
                  Écrivez un brief et vos agents IA collaboreront en temps réel
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
