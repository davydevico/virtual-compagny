import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, addProjectLog } from '@/lib/supabase';

export async function GET() {
  const { data: projects } = await supabaseAdmin
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  return NextResponse.json(projects ?? []);
}

// Met à jour le statut d'un projet (utilisé pour forcer paused/completed côté client)
export async function PATCH(req: NextRequest) {
  try {
    const { projectId, status } = await req.json();
    if (!projectId || !['running', 'completed', 'paused'].includes(status)) {
      return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 });
    }
    await supabaseAdmin.from('projects').update({ status }).eq('id', projectId);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// Crée uniquement le projet et retourne l'id immédiatement.
// L'orchestration est déclenchée ensuite depuis le client via POST /api/project/[id]/run.
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
      console.error('[POST /api/project] insert error:', error);
      return NextResponse.json({ error: 'Erreur création projet' }, { status: 500 });
    }

    await addProjectLog(project.id, 'Davy — CEO', `Nouveau projet lancé : "${brief.trim()}"`, 'system');

    return NextResponse.json({ projectId: project.id });
  } catch (err) {
    console.error('[POST /api/project]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
