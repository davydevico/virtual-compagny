import { NextRequest, NextResponse } from 'next/server';
import { getLastMemories } from '@/lib/supabase';

export async function GET(
  _req: NextRequest,
  { params }: { params: { agentId: string } },
) {
  const memories = await getLastMemories(params.agentId, 50);
  return NextResponse.json(memories);
}
