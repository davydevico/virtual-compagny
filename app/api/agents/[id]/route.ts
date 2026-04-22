import { NextRequest, NextResponse } from 'next/server';
import { getAgentById } from '@/lib/supabase';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const agent = await getAgentById(params.id);

  if (!agent) {
    return NextResponse.json({ error: 'Agent introuvable' }, { status: 404 });
  }

  return NextResponse.json(agent);
}
