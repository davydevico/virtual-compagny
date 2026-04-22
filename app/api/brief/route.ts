import { NextRequest, NextResponse } from 'next/server';
import { callAgent } from '@/lib/claude';
import { getAllAgents } from '@/lib/supabase';

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const { fromAgentName, agentName, agentRole, task } = await req.json();

    const agents = await getAllAgents();
    const target = agents.find(
      a => a.name.toLowerCase() === agentName.toLowerCase()
        || a.role.toLowerCase().includes((agentRole ?? '').toLowerCase()),
    );

    if (!target) {
      return NextResponse.json({ error: `Agent "${agentName}" introuvable` }, { status: 404 });
    }

    const response = await callAgent(
      target.id,
      `${fromAgentName} me confie cette mission :\n\n"${task}"\n\nJe fournis un livrable concret, complet et immédiatement utilisable.`,
    );

    return NextResponse.json({
      agentId:     target.id,
      agentName:   target.name,
      agentRole:   target.role,
      agentAvatar: target.avatar,
      message:     response.message,
    });
  } catch (err: unknown) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error('[/api/brief]', detail);
    return NextResponse.json({ error: detail }, { status: 500 });
  }
}
