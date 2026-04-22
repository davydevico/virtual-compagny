import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  // Récupérer les logs + le rôle de l'agent via join
  const { data: logs } = await supabaseAdmin
    .from('project_logs')
    .select('*, agents(role, department)')
    .eq('project_id', params.id)
    .order('created_at', { ascending: true });

  return NextResponse.json(logs ?? []);
}
