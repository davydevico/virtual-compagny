import { NextRequest, NextResponse } from 'next/server';
import { callAgent, callAgentWithImage } from '@/lib/claude';

export async function POST(req: NextRequest) {
  try {
    const { agentId, message, imageData, imageMimeType } = await req.json();

    if (!agentId || !message?.trim()) {
      return NextResponse.json(
        { error: 'agentId et message sont requis' },
        { status: 400 },
      );
    }

    const response = imageData
      ? await callAgentWithImage(agentId, message.trim(), imageData, imageMimeType ?? 'image/jpeg')
      : await callAgent(agentId, message.trim());

    return NextResponse.json(response);
  } catch (err: unknown) {
    // Remonter le détail de l'erreur Anthropic pour le debug
    const detail = err instanceof Error ? err.message : String(err);
    console.error('[/api/chat]', detail);
    return NextResponse.json(
      { error: detail },
      { status: 500 },
    );
  }
}
