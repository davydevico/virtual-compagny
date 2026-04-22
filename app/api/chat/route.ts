import { NextRequest, NextResponse } from 'next/server';
import { callAgent, callAgentWithImage } from '@/lib/claude';
import { getAllAgents } from '@/lib/supabase';

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const { agentId, message, imageData, imageMimeType } = await req.json();

    if (!agentId || !message?.trim()) {
      return NextResponse.json(
        { error: 'agentId et message sont requis' },
        { status: 400 },
      );
    }

    // 1. Réponse de l'agent principal
    const response = imageData
      ? await callAgentWithImage(agentId, message.trim(), imageData, imageMimeType ?? 'image/jpeg')
      : await callAgent(agentId, message.trim());

    // 2. Si délégation détectée → exécution automatique de la chaîne
    if (response.delegation) {
      const agents  = await getAllAgents();
      const target  = agents.find(
        a => a.name.toLowerCase() === response.delegation!.agentName.toLowerCase()
          || a.role.toLowerCase().includes(response.delegation!.agentRole?.toLowerCase() ?? ''),
      );

      if (target) {
        // Brief automatique de l'agent délégué
        const delegateResponse = await callAgent(
          target.id,
          `${response.agentName} (${response.agentName === 'Marcus' ? 'CTO' : 'manager'}) me délègue cette tâche :\n\n"${response.delegation!.task}"\n\nJe prends en charge et fournis un livrable concret.`,
        );

        // L'agent principal synthétise le résultat pour le CEO
        const synthesis = await callAgent(
          agentId,
          `${target.name} vient de terminer la tâche que je lui avais confiée. Voici son rapport complet :\n\n${delegateResponse.message}\n\nFais une synthèse courte (max 5 lignes) pour le CEO Davy : ce qui a été fait, par qui, et quel est le résultat / prochaine étape.`,
        );

        return NextResponse.json({
          ...synthesis,
          delegation: {
            ...response.delegation,
            agentId:          target.id,
            agentAvatar:      target.avatar,
            delegateMessage:  delegateResponse.message,
            initialMessage:   response.message,
            autoExecuted:     true,
          },
        });
      }
    }

    return NextResponse.json(response);
  } catch (err: unknown) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error('[/api/chat]', detail);
    return NextResponse.json({ error: detail }, { status: 500 });
  }
}
