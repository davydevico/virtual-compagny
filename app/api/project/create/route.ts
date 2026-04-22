import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, addProjectLog } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { brief } = await req.json();

    if (!brief?.trim()) {
      return NextResponse.json({ error: 'brief requis' }, { status: 400 });
    }

    const { data: project, error } = await supabaseAdmin
      .from('projects')
      .insert({ title: brief.trim().slice(0, 80), brief: brief.trim() })
      .select()
      .single();

    if (error || !project) {
      return NextResponse.json({ error: 'Erreur création projet' }, { status: 500 });
    }

    await addProjectLog(
      project.id,
      'Système',
      `Nouveau projet lancé : "${brief.trim()}"`,
      'system',
    );

    return NextResponse.json({ projectId: project.id, project }, { status: 201 });
  } catch (err) {
    console.error('[/api/project/create]', err);
    return NextResponse.json({ error: 'Erreur création projet' }, { status: 500 });
  }
}
