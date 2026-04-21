import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { data: logs } = await supabaseAdmin
    .from('project_logs')
    .select('*')
    .eq('project_id', params.id)
    .order('created_at', { ascending: true });

  return NextResponse.json(logs ?? []);
}
