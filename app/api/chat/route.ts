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

    // 2. Si des délégations sont détectées → exécution automatique en parallèle
    if (response.delegations.length > 0) {
      const agents = await getAllAgents();

      // Résoudre les agents cibles et les briefer tous en parallèle
      const delegationResults = await Promise.all(
        response.delegations.map(async (delegation) => {
          const target = agents.find(
            a => a.name.toLowerCase() === delegation.agentName.toLowerCase()
              || a.role.toLowerCase().includes((delegation.agentRole ?? '').toLowerCase()),
          );
          if (!target) return null;

          const delegateResponse = await callAgent(
            target.id,
            `${response.agentName} me délègue cette mission :\n\n"${delegation.task}"\n\nJe livre un rapport concret et actionnable.`,
          );

          return {
            agentId:         target.id,
            agentName:       target.name,
            agentRole:       target.role,
            agentAvatar:     target.avatar,
            task:            delegation.task,
            delegateMessage: delegateResponse.message,
            autoExecuted:    true as const,
          };
        }),
      );

      const validResults = delegationResults.filter(Boolean) as NonNullable<typeof delegationResults[0]>[];

      // 3. Le manager synthétise tous les rapports pour le CEO
      const reportsBlock = validResults
        .map(r => `### ${r.agentName} — ${r.agentRole}\n${r.delegateMessage}`)
        .join('\n\n---\n\n');

      const synthesis = await callAgent(
        agentId,
        `Voici les rapports de toute l'équipe que j'ai briefée :\n\n${reportsBlock}\n\nFais une synthèse courte (5 lignes max) pour le CEO Davy : ce qui a été fait, par qui, résultat et prochaine étape éventuelle.`,
      );

      return NextResponse.json({
        agentId:     synthesis.agentId,
        agentName:   synthesis.agentName,
        message:     synthesis.message,
        delegations: validResults,
      });
    }

    return NextResponse.json(response);
  } catch (err: unknown) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error('[/api/chat]', detail);
    return NextResponse.json({ error: detail }, { status: 500 });
  }
}
