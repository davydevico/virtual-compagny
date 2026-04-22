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
  } catch (err) {
    console.error('[/api/chat]', err);
    return NextResponse.json(
      { error: 'Erreur lors de l\'appel Claude' },
      { status: 500 },
    );
  }
}
