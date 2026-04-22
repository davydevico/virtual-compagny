import { NextRequest, NextResponse } from 'next/server';
import { callAgent } from '@/lib/claude';

export const maxDuration = 120;

interface DelegationResult {
  agentName:   string;
  agentRole:   string;
  message:     string;
}

export async function POST(req: NextRequest) {
  try {
    const { agentId, results }: { agentId: string; results: DelegationResult[] } = await req.json();

    const reportsBlock = results
      .map(r => `### ${r.agentName} — ${r.agentRole}\n${r.message}`)
      .join('\n\n---\n\n');

    const response = await callAgent(
      agentId,
      `Mon équipe vient de terminer. Voici leurs livrables complets :\n\n${reportsBlock}\n\nProduis maintenant le guide d'implémentation complet pour le CEO Davy, en suivant le format obligatoire avec toutes les étapes, le code exact et les commandes à exécuter.`,
    );

    return NextResponse.json({ message: response.message });
  } catch (err: unknown) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error('[/api/synthesize]', detail);
    return NextResponse.json({ error: detail }, { status: 500 });
  }
}
