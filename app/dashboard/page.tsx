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

export default async function DashboardPage() {
  const { agents, pending, projects } = await getStats();

  // Grouper par département
  const departments: Record<string, typeof agents> = {};
  for (const agent of agents) {
    if (!departments[agent.department]) departments[agent.department] = [];
    departments[agent.department].push(agent);
  }

  const deptOrder = ['Tech', 'Finance', 'Marketing', 'Design', 'Opérations'];
  const sortedDepts = deptOrder.filter(d => departments[d]);

  const running  = projects.filter(p => p.status === 'running').length;
  const done     = projects.filter(p => p.status === 'completed').length;

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Dashboard SURGIFLOW"
        subtitle="Vue d'ensemble de votre équipe d'agents IA"
        icon="🏢"
        actions={
          pending.length > 0 ? (
            <Link
              href="/recruit"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-sm font-medium hover:bg-yellow-500/20 transition-colors"
            >
              ⚠️ {pending.length} demande{pending.length > 1 ? 's' : ''} en attente
            </Link>
          ) : null
        }
      />

      {/* Stats */}
      <div className="px-8 py-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Agents actifs"    value={agents.length}  icon="👥" color="blue"   />
        <StatCard label="Départements"     value={sortedDepts.length} icon="🏗️" color="purple" />
        <StatCard label="Projets en cours" value={running}         icon="🚀" color="orange" />
        <StatCard label="Projets terminés" value={done}            icon="✅" color="green"  />
      </div>

      {/* Organigramme par département */}
      <div className="px-8 pb-8 space-y-8">
        {sortedDepts.map(dept => (
          <section key={dept}>
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-base font-semibold text-white">{dept}</h2>
              <span className="text-xs text-slate-500 bg-[#1a2235] border border-[#1e2d4a] rounded-full px-2 py-0.5">
                {departments[dept].length} agent{departments[dept].length > 1 ? 's' : ''}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {departments[dept].map(agent => (
                <AgentCard key={agent.id} agent={agent} />
              ))}
            </div>
          </section>
        ))}

        {agents.length === 0 && (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">👥</div>
            <h3 className="text-lg font-medium text-white mb-2">Aucun agent encore</h3>
            <p className="text-sm text-slate-400 mb-6">Commencez par recruter votre équipe de direction</p>
            <Link
              href="/recruit"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              👥 Recruter le premier agent
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color }: {
  label: string;
  value: number;
  icon:  string;
  color: 'blue' | 'purple' | 'orange' | 'green';
}) {
  const colors = {
    blue:   'bg-blue-500/10 border-blue-500/20',
    purple: 'bg-purple-500/10 border-purple-500/20',
    orange: 'bg-orange-500/10 border-orange-500/20',
    green:  'bg-green-500/10 border-green-500/20',
  };

  return (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-xs text-slate-400 mt-1">{label}</div>
    </div>
  );
}
