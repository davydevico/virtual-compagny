'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import PageHeader from '@/components/PageHeader';
import LogEntry from '@/components/LogEntry';
import type { Project, ProjectLog } from '@/lib/supabase';

const TEXT_EXTENSIONS = /\.(txt|md|csv|json|ts|tsx|js|jsx|py|sql|html|css|xml|yaml|yml|sh)$/i;

interface AttachedFile {
  name:    string;
  content: string;
}

export default function ProjectPage() {
  const [brief, setBrief]               = useState('');
  const [projects, setProjects]         = useState<Project[]>([]);
  const [selected, setSelected]         = useState<Project | null>(null);
  const [logs, setLogs]                 = useState<ProjectLog[]>([]);
  const [running, setRunning]           = useState(false);
  const [polling, setPolling]           = useState(false);
  const [attachedFile, setAttachedFile] = useState<AttachedFile | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const pollRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileRef    = useRef<HTMLInputElement>(null);

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isText = TEXT_EXTENSIONS.test(file.name) || file.type.startsWith('text/');
    if (!isText) {
      alert('Format non supporté. Utilisez : .txt, .md, .csv, .json, .ts, .js, .py, .sql...');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.readAsText(file);
    reader.onload = () => {
      setAttachedFile({ name: file.name, content: reader.result as string });
    };
    e.target.value = '';
  };

  const launchProject = async () => {
    if (!brief.trim() || running) return;
    setRunning(true);
    setLogs([]);

    let fullBrief = brief.trim();
    if (attachedFile) {
      fullBrief = `${fullBrief}\n\n[Fichier joint : ${attachedFile.name}]\n\`\`\`\n${attachedFile.content}\n\`\`\``;
    }
    setAttachedFile(null);

    try {
      const res = await fetch('/api/project', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ brief: fullBrief }),
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

            {/* Fichier joint */}
            <input
              ref={fileRef}
              type="file"
              accept=".txt,.md,.csv,.json,.ts,.tsx,.js,.jsx,.py,.sql,.html,.css,.xml,.yaml,.yml,.sh"
              className="hidden"
              onChange={handleFileSelect}
            />
            {attachedFile ? (
              <div className="mt-2 flex items-center gap-2 bg-[#0a0d14] border border-[#1e2d4a] rounded-lg px-3 py-2">
                <span className="text-base">📄</span>
                <span className="text-xs text-slate-300 flex-1 truncate">{attachedFile.name}</span>
                <button
                  onClick={() => setAttachedFile(null)}
                  className="text-slate-500 hover:text-red-400 transition-colors text-sm"
                >✕</button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                disabled={running}
                className="mt-2 w-full py-2 rounded-lg border border-dashed border-[#1e2d4a] text-xs text-slate-500 hover:border-blue-500/40 hover:text-blue-400 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
                Joindre un fichier (optionnel)
              </button>
            )}

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
