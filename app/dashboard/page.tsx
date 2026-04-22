import { supabaseAdmin, getAllAgents, getPendingRecruitments } from '@/lib/supabase';
import PageHeader from '@/components/PageHeader';
import AgentCard from '@/components/AgentCard';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

async function getStats() {
  const [agents, pending, projects] = await Promise.all([
    getAllAgents(),
    getPendingRecruitments(),
    supabaseAdmin.from('projects').select('id, status').then(r => r.data ?? []),
  ]);
  return { agents, pending, projects };
}

const DEPT_ORDER  = ['Tech', 'Finance', 'Marketing', 'Design', 'Opérations'];
const DEPT_COLORS: Record<string, string> = {
  Tech:       'text-blue-400 bg-blue-500/10 border-blue-500/20',
  Finance:    'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  Marketing:  'text-violet-400 bg-violet-500/10 border-violet-500/20',
  Design:     'text-pink-400 bg-pink-500/10 border-pink-500/20',
  Opérations: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
};

export default async function DashboardPage() {
  const { agents, pending, projects } = await getStats();

  const departments: Record<string, typeof agents> = {};
  for (const agent of agents) {
    if (!departments[agent.department]) departments[agent.department] = [];
    departments[agent.department].push(agent);
  }
  const sortedDepts = DEPT_ORDER.filter(d => departments[d]);
  const running = projects.filter(p => p.status === 'running').length;
  const done    = projects.filter(p => p.status === 'completed').length;

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Dashboard"
        subtitle="Vue d'ensemble de votre équipe d'agents IA"
        icon="🏢"
        actions={
          pending.length > 0 ? (
            <Link
              href="/recruit"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-400 text-xs font-semibold hover:bg-amber-500/20 transition-colors"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              {pending.length} en attente
            </Link>
          ) : null
        }
      />

      {/* Stats */}
      <div className="px-4 md:px-6 pt-4 md:pt-5 pb-2 grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Agents actifs"    value={agents.length}      icon="👥" color="blue"   />
        <StatCard label="Départements"     value={sortedDepts.length} icon="🏗️" color="violet" />
        <StatCard label="En cours"         value={running}            icon="⚡" color="amber"  />
        <StatCard label="Terminés"         value={done}               icon="✅" color="emerald" />
      </div>

      {/* Agents par département */}
      <div className="px-4 md:px-6 py-4 space-y-6">
        {agents.length === 0 && (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">👥</div>
            <h3 className="text-lg font-semibold text-white mb-2">Aucun agent encore</h3>
            <p className="text-sm text-slate-400 mb-6">Commencez par recruter votre équipe</p>
            <Link href="/recruit" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors">
              Recruter le premier agent
            </Link>
          </div>
        )}

        {sortedDepts.map(dept => (
          <section key={dept}>
            <div className="flex items-center gap-2.5 mb-3">
              <h2 className="text-sm font-semibold text-white">{dept}</h2>
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${DEPT_COLORS[dept] ?? 'text-slate-400 bg-slate-500/10 border-slate-500/20'}`}>
                {departments[dept].length} agent{departments[dept].length > 1 ? 's' : ''}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 md:gap-3">
              {departments[dept].map(agent => (
                <AgentCard key={agent.id} agent={agent} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color }: {
  label: string; value: number; icon: string;
  color: 'blue' | 'violet' | 'amber' | 'emerald';
}) {
  const styles = {
    blue:   { card: 'border-blue-500/15 bg-blue-500/5',    val: 'text-blue-300' },
    violet: { card: 'border-violet-500/15 bg-violet-500/5', val: 'text-violet-300' },
    amber:  { card: 'border-amber-500/15 bg-amber-500/5',  val: 'text-amber-300' },
    emerald:{ card: 'border-emerald-500/15 bg-emerald-500/5', val: 'text-emerald-300' },
  };
  const s = styles[color];

  return (
    <div className={`rounded-2xl border p-4 ${s.card}`}>
      <div className="text-xl mb-2">{icon}</div>
      <div className={`text-2xl font-bold tabular-nums ${s.val}`}>{value}</div>
      <div className="text-xs text-slate-500 mt-0.5 font-medium">{label}</div>
    </div>
  );
}
