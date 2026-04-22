'use client';

import { useState, useEffect, useCallback } from 'react';
import PageHeader from '@/components/PageHeader';
import type { RecruitmentRequest } from '@/lib/supabase';

const CLEVELS = [
  { name: 'Marcus', role: 'CTO',          department: 'Tech',       avatar: '⚡', desc: 'Directeur Technique' },
  { name: 'Rachel', role: 'CFO',          department: 'Finance',    avatar: '💰', desc: 'Directrice Financière' },
  { name: 'Sophie', role: 'CMO',          department: 'Marketing',  avatar: '📢', desc: 'Directrice Marketing' },
  { name: 'Inès',   role: 'Lead Designer',department: 'Design',     avatar: '✏️', desc: 'Designer UI/UX' },
  { name: 'David',  role: 'COO',          department: 'Opérations', avatar: '⚙️', desc: 'Directeur Opérations' },
];

const DEPT_COLORS: Record<string, string> = {
  Tech: 'text-blue-400', Finance: 'text-emerald-400', Marketing: 'text-violet-400',
  Design: 'text-pink-400', Opérations: 'text-amber-400',
};

interface AgentLike { name: string; role: string; department: string; avatar: string }

export default function RecruitPage() {
  const [existingAgents,   setExistingAgents]   = useState<AgentLike[]>([]);
  const [pendingRequests,  setPendingRequests]  = useState<RecruitmentRequest[]>([]);
  const [recruiting, setRecruiting] = useState<string | null>(null);
  const [approving,  setApproving]  = useState<string | null>(null);
  const [message,    setMessage]    = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchData = useCallback(async () => {
    const [agentsRes, requestsRes] = await Promise.all([
      fetch('/api/agents'),
      fetch('/api/recruit'),
    ]);
    if (agentsRes.ok)   setExistingAgents(await agentsRes.json());
    if (requestsRes.ok) setPendingRequests(await requestsRes.json());
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const existingNames = new Set(existingAgents.map(a => a.name));

  const recruitCLevel = async (agent: typeof CLEVELS[0]) => {
    setRecruiting(agent.role);
    setMessage(null);
    try {
      const res  = await fetch('/api/recruit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(agent),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: `${agent.name} recruté·e ! ${data.recruitmentRequestsCreated} demandes générées.` });
        await fetchData();
      } else {
        setMessage({ type: 'error', text: data.error ?? 'Erreur recrutement' });
      }
    } finally { setRecruiting(null); }
  };

  const handleRequest = async (id: string, action: 'approve' | 'reject') => {
    setApproving(id);
    try {
      const res = await fetch('/api/recruit', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      });
      if (res.ok) {
        setMessage({ type: 'success', text: action === 'approve' ? 'Agent créé et activé !' : 'Demande refusée.' });
        await fetchData();
      }
    } finally { setApproving(null); }
  };

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Recrutement"
        subtitle="Construisez votre équipe et validez les demandes"
        icon="👥"
        actions={
          <span className="text-xs text-slate-500 font-medium">
            {existingAgents.length} agent{existingAgents.length !== 1 ? 's' : ''}
          </span>
        }
      />

      <div className="px-4 md:px-6 py-4 space-y-6">
        {/* Feedback */}
        {message && (
          <div className={`rounded-xl p-3.5 text-sm border animate-fade-in flex items-start gap-2.5 ${
            message.type === 'success'
              ? 'bg-emerald-500/8 border-emerald-500/20 text-emerald-400'
              : 'bg-red-500/8 border-red-500/20 text-red-400'
          }`}>
            <span className="text-base mt-0.5">{message.type === 'success' ? '✅' : '❌'}</span>
            <span>{message.text}</span>
          </div>
        )}

        {/* C-Levels */}
        <section>
          <div className="mb-3">
            <h2 className="text-sm font-bold text-white">Direction</h2>
            <p className="text-xs text-slate-500 mt-0.5">Recrutez les C-Levels — chaque recrutement génère automatiquement des demandes pour leurs équipes.</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 md:gap-3">
            {CLEVELS.map(cl => {
              const recruited = existingNames.has(cl.name);
              const loading   = recruiting === cl.role;
              return (
                <div
                  key={cl.role}
                  className={`rounded-2xl border p-4 transition-all ${
                    recruited
                      ? 'bg-emerald-500/5 border-emerald-500/15'
                      : 'bg-[#161b27] border-white/6 hover:border-white/12'
                  }`}
                >
                  <div className="text-3xl mb-3">{cl.avatar}</div>
                  <p className="text-sm font-semibold text-white leading-tight">{cl.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{cl.desc}</p>
                  <p className={`text-[11px] font-medium mt-1 ${DEPT_COLORS[cl.department] ?? 'text-slate-400'}`}>{cl.department}</p>

                  {recruited ? (
                    <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      Recruté·e
                    </div>
                  ) : (
                    <button
                      onClick={() => recruitCLevel(cl)}
                      disabled={loading}
                      className="mt-3 w-full px-2.5 py-1.5 rounded-lg bg-blue-600/10 text-blue-400 text-xs font-semibold border border-blue-500/20 hover:bg-blue-600/20 transition-colors disabled:opacity-40"
                    >
                      {loading ? '⏳ …' : '+ Recruter'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Demandes en attente */}
        <section>
          <div className="flex items-center gap-2.5 mb-3">
            <h2 className="text-sm font-bold text-white">Demandes en attente</h2>
            {pendingRequests.length > 0 && (
              <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[11px] font-bold px-2 py-0.5 rounded-full">
                {pendingRequests.length}
              </span>
            )}
          </div>

          {pendingRequests.length === 0 ? (
            <div className="rounded-2xl border border-white/5 bg-[#0d1117] p-8 text-center">
              <div className="text-3xl mb-2">📭</div>
              <p className="text-sm text-slate-500">Aucune demande en attente</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {pendingRequests.map(req => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const requester = (req as any).agents;
                const loading   = approving === req.id;

                return (
                  <div key={req.id} className="bg-[#161b27] border border-white/6 rounded-2xl p-4 hover:border-white/10 transition-all">
                    <div className="flex items-start gap-3 md:gap-4">
                      <div className="flex-1 min-w-0">
                        {requester && (
                          <p className="text-[11px] text-slate-500 mb-1.5">
                            {requester.avatar} <span className="font-medium text-slate-400">{requester.name}</span> ({requester.role}) demande :
                          </p>
                        )}
                        <p className="text-sm font-bold text-white">{req.role_needed}</p>
                        <span className={`text-[11px] font-medium ${DEPT_COLORS[req.department] ?? 'text-slate-400'}`}>{req.department}</span>
                        <p className="text-xs text-slate-400 mt-2 leading-relaxed">{req.reason}</p>
                        <p className="text-[11px] text-slate-600 mt-2">
                          {new Date(req.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                        </p>
                      </div>

                      <div className="flex flex-col gap-2 shrink-0">
                        <button
                          onClick={() => handleRequest(req.id, 'approve')}
                          disabled={loading}
                          className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-semibold border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors disabled:opacity-40 whitespace-nowrap"
                        >
                          {loading ? '⏳' : '✓ Approuver'}
                        </button>
                        <button
                          onClick={() => handleRequest(req.id, 'reject')}
                          disabled={loading}
                          className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs font-semibold border border-red-500/20 hover:bg-red-500/20 transition-colors disabled:opacity-40"
                        >
                          Refuser
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
