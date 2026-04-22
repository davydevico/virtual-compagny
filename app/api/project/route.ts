import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  const { data: projects } = await supabaseAdmin
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  return NextResponse.json(projects ?? []);
}
