'use client';

import { useState, useEffect, useCallback } from 'react';
import PageHeader from '@/components/PageHeader';
import type { RecruitmentRequest } from '@/lib/supabase';

// C-Levels prédéfinis (recrutement direct CEO)
const CLEVELS = [
  { name: 'Marcus', role: 'CTO',  department: 'Tech',       avatar: '⚡', desc: 'Directeur Technique' },
  { name: 'Rachel', role: 'CFO',  department: 'Finance',    avatar: '💰', desc: 'Directrice Financière' },
  { name: 'Sophie', role: 'CMO',  department: 'Marketing',  avatar: '📢', desc: 'Directrice Marketing' },
  { name: 'Inès',   role: 'Lead Designer', department: 'Design', avatar: '✏️', desc: 'Designer UI/UX' },
  { name: 'David',  role: 'COO',  department: 'Opérations', avatar: '⚙️', desc: 'Directeur Opérations' },
];

interface AgentLike { name: string; role: string; department: string; avatar: string }

export default function RecruitPage() {
  const [existingAgents, setExistingAgents]   = useState<AgentLike[]>([]);
  const [pendingRequests, setPendingRequests] = useState<RecruitmentRequest[]>([]);
  const [loading, setLoading]   = useState(false);
  const [recruiting, setRecruiting] = useState<string | null>(null);
  const [approving, setApproving]   = useState<string | null>(null);
  const [message, setMessage]       = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchData = useCallback(async () => {
    const [agentsRes, requestsRes] = await Promise.all([
      fetch('/api/agents'),
      fetch('/api/recruit'),
    ]);
    if (agentsRes.ok)   setExistingAgents(await agentsRes.json());
    if (requestsRes.ok) setPendingRequests(await requestsRes.json());
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const existingRoles = new Set(existingAgents.map(a => a.role));

  const recruitCLevel = async (agent: typeof CLEVELS[0]) => {
    setRecruiting(agent.role);
    setMessage(null);
    try {
      const res = await fetch('/api/recruit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(agent),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({
          type: 'success',
          text: `${agent.name} recruté·e ! ${data.recruitmentRequestsCreated} demandes de recrutement générées.`,
        });
        await fetchData();
      } else {
        setMessage({ type: 'error', text: data.error ?? 'Erreur recrutement' });
      }
    } finally {
      setRecruiting(null);
    }
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
        setMessage({
          type: 'success',
          text: action === 'approve' ? 'Agent créé et activé !' : 'Demande refusée.',
        });
        await fetchData();
      }
    } finally {
      setApproving(null);
    }
  };

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Recrutement"
        subtitle="Construisez votre équipe de direction et validez les demandes"
        icon="👥"
        actions={
          <span className="text-sm text-slate-400">
            {existingAgents.length} agent{existingAgents.length > 1 ? 's' : ''} actif{existingAgents.length > 1 ? 's' : ''}
          </span>
        }
      />

      <div className="px-8 py-6 space-y-8">
        {/* Message feedback */}
        {message && (
          <div className={`rounded-lg p-4 text-sm border animate-fade-in ${
            message.type === 'success'
              ? 'bg-green-500/10 border-green-500/30 text-green-400'
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}>
            {message.type === 'success' ? '✅' : '❌'} {message.text}
          </div>
        )}

        {/* Section C-Levels */}
        <section>
          <h2 className="text-base font-semibold text-white mb-1">Direction — Recrutement direct CEO</h2>
          <p className="text-sm text-slate-400 mb-4">
            Recrutez les C-Levels. Chaque recrutement génère automatiquement des demandes de recrutement pour leurs équipes.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            {CLEVELS.map(cl => {
              const alreadyRecruited = existingRoles.has(cl.role);
              const isLoading = recruiting === cl.role;

              return (
                <div key={cl.role} className={`rounded-xl border p-4 transition-all ${
                  alreadyRecruited
                    ? 'bg-green-500/5 border-green-500/20'
                    : 'bg-[#1a2235] border-[#1e2d4a] hover:border-blue-500/30'
                }`}>
                  <div className="text-3xl mb-3">{cl.avatar}</div>
                  <div className="font-semibold text-white text-sm">{cl.name}</div>
                  <div className="text-xs text-slate-400">{cl.desc}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{cl.department}</div>

                  {alreadyRecruited ? (
                    <span className="mt-3 inline-flex items-center gap-1 text-xs text-green-400">
                      ✓ Recruté·e
                    </span>
                  ) : (
                    <button
                      onClick={() => recruitCLevel(cl)}
                      disabled={isLoading}
                      className="mt-3 w-full px-3 py-1.5 rounded-lg bg-blue-600/10 text-blue-400 text-xs font-medium border border-blue-500/20 hover:bg-blue-600/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? '⏳ Recrutement...' : '+ Recruter'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Section demandes en attente */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-base font-semibold text-white">Demandes en attente</h2>
            {pendingRequests.length > 0 && (
              <span className="bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 text-xs px-2 py-0.5 rounded-full">
                {pendingRequests.length}
              </span>
            )}
          </div>

          {pendingRequests.length === 0 ? (
            <div className="rounded-xl border border-[#1e2d4a] bg-[#111827] p-8 text-center">
              <div className="text-3xl mb-2">📭</div>
              <p className="text-sm text-slate-400">Aucune demande en attente</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingRequests.map(req => {
                const requester = (req as any).agents;
                const isLoading = approving === req.id;

                return (
                  <div
                    key={req.id}
                    className="bg-[#1a2235] border border-[#1e2d4a] rounded-xl p-4 hover:border-blue-500/20 transition-all"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {requester && (
                            <span className="text-xs text-slate-500">
                              {requester.avatar} {requester.name} ({requester.role}) demande :
                            </span>
                          )}
                        </div>
                        <h3 className="font-semibold text-white text-sm">{req.role_needed}</h3>
                        <span className="text-xs text-slate-400">{req.department}</span>
                        <p className="text-sm text-slate-300 mt-2 leading-relaxed">{req.reason}</p>
                        <p className="text-xs text-slate-500 mt-2">
                          {new Date(req.created_at).toLocaleDateString('fr-FR', {
                            day: 'numeric', month: 'long', year: 'numeric',
                          })}
                        </p>
                      </div>

                      <div className="flex flex-col gap-2 shrink-0">
                        <button
                          onClick={() => handleRequest(req.id, 'approve')}
                          disabled={isLoading}
                          className="px-4 py-2 rounded-lg bg-green-600/10 text-green-400 text-xs font-medium border border-green-500/20 hover:bg-green-600/20 transition-colors disabled:opacity-50"
                        >
                          {isLoading ? '⏳' : '✅ Approuver'}
                        </button>
                        <button
                          onClick={() => handleRequest(req.id, 'reject')}
                          disabled={isLoading}
                          className="px-4 py-2 rounded-lg bg-red-600/10 text-red-400 text-xs font-medium border border-red-500/20 hover:bg-red-600/20 transition-colors disabled:opacity-50"
                        >
                          ❌ Refuser
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
