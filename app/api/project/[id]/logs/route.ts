import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  // 1. Logs bruts — requête simple, robuste, sans JOIN
  const { data: logs, error } = await supabaseAdmin
    .from('project_logs')
    .select('*')
    .eq('project_id', params.id)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[logs] erreur supabase:', error);
    return NextResponse.json([], { status: 200 });
  }

  if (!logs || logs.length === 0) {
    return NextResponse.json([]);
  }

  // 2. Enrichissement séparé (role + department depuis agents)
  //    Si ça échoue, on retourne quand même les logs — pas de cascade d'erreur
  const agentIds = Array.from(new Set(logs.map(l => l.agent_id).filter(Boolean)));
  let agentsMap: Record<string, { role: string; department: string }> = {};

  if (agentIds.length > 0) {
    const { data: agents } = await supabaseAdmin
      .from('agents')
      .select('id, role, department')
      .in('id', agentIds);

    if (agents) {
      agentsMap = Object.fromEntries(
        agents.map(a => [a.id, { role: a.role, department: a.department }]),
      );
    }
  }

  const enriched = logs.map(log => ({
    ...log,
    agents: log.agent_id ? agentsMap[log.agent_id] ?? null : null,
  }));

  return NextResponse.json(enriched);
}
