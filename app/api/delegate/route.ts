import { NextRequest, NextResponse } from 'next/server';
import { callAgent } from '@/lib/claude';
import { getAllAgents } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { fromAgentName, toAgentName, toAgentRole, task } = await req.json();

    if (!toAgentName || !task) {
      return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 });
    }

    // Trouver l'agent cible par nom ou rôle
    const agents = await getAllAgents();
    const target  = agents.find(
      a => a.name.toLowerCase() === toAgentName.toLowerCase()
        || a.role.toLowerCase().includes(toAgentRole?.toLowerCase() ?? ''),
    );

    if (!target) {
      return NextResponse.json({ error: `Agent "${toAgentName}" introuvable` }, { status: 404 });
    }

    // Envoyer le brief initial de la part du manager
    const briefMessage = `${fromAgentName} me délègue la tâche suivante :\n\n"${task}"\n\nJe prends en main ce sujet.`;

    const response = await callAgent(target.id, briefMessage);

    return NextResponse.json({
      agentId:   target.id,
      agentName: target.name,
      agentRole: target.role,
      avatar:    target.avatar,
      message:   response.message,
    });
  } catch (err) {
    console.error('[POST /api/delegate]', err);
    return NextResponse.json({ error: 'Erreur délégation' }, { status: 500 });
  }
}
