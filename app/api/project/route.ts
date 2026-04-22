import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, addProjectLog, getAllAgents } from '@/lib/supabase';
import { orchestrateProject, callAgent } from '@/lib/claude';

export const maxDuration = 300;

export async function GET() {
  const { data: projects } = await supabaseAdmin
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  return NextResponse.json(projects ?? []);
}

export async function POST(req: NextRequest) {
  try {
    const { brief } = await req.json();

    if (!brief?.trim()) {
      return NextResponse.json({ error: 'brief requis' }, { status: 400 });
    }

    // 1. Créer le projet
    const { data: project, error } = await supabaseAdmin
      .from('projects')
      .insert({ title: brief.trim().slice(0, 80), brief: brief.trim() })
      .select()
      .single();

    if (error || !project) {
      return NextResponse.json({ error: 'Erreur création projet' }, { status: 500 });
    }

    const projectId = project.id;

    await addProjectLog(projectId, 'Système', `Nouveau projet lancé : "${brief.trim()}"`, 'system');

    // 2. Orchestration
    const agents = await getAllAgents();

    if (agents.length === 0) {
      await addProjectLog(projectId, 'Système', 'Aucun agent disponible. Recrutez d\'abord votre équipe.', 'error');
      await supabaseAdmin.from('projects').update({ status: 'paused' }).eq('id', projectId);
      return NextResponse.json({ error: 'Aucun agent disponible' }, { status: 400 });
    }

    await addProjectLog(projectId, 'Orchestrateur', 'Analyse du brief et décomposition en tâches...', 'thinking');

    const tasks = await orchestrateProject(brief.trim(), agents);

    await addProjectLog(
      projectId,
      'Orchestrateur',
      `${tasks.length} tâche${tasks.length > 1 ? 's' : ''} identifiée${tasks.length > 1 ? 's' : ''} pour : ${tasks.map(t => t.agentName).join(', ')}`,
      'system',
    );

    const outputs: Record<string, string> = {};

    for (const task of tasks) {
      try {
        await addProjectLog(projectId, task.agentName, `Traitement : ${task.task}`, 'thinking', task.agentId);

        const previousOutputs = Object.entries(outputs)
          .map(([name, out]) => `### ${name} :\n${out}`)
          .join('\n\n');

        const contextualMessage = previousOutputs
          ? `${task.task}\n\n## Contexte des équipes précédentes :\n${previousOutputs}`
          : task.task;

        const response = await callAgent(
          task.agentId,
          contextualMessage,
          projectId,
          `Tu travailles sur le projet : "${brief.trim()}"`,
        );

        outputs[task.agentName] = response.message;

        await addProjectLog(projectId, task.agentName, response.message, 'output', task.agentId);
      } catch (taskErr) {
        console.error(`Erreur tâche ${task.agentName}:`, taskErr);
        await addProjectLog(
          projectId,
          task.agentName,
          `Erreur lors du traitement : ${taskErr instanceof Error ? taskErr.message : 'Erreur inconnue'}`,
          'error',
          task.agentId,
        );
      }
    }

    await addProjectLog(
      projectId,
      'Système',
      `✅ Projet complété — ${Object.keys(outputs).length} agent${Object.keys(outputs).length > 1 ? 's' : ''} ont contribué.`,
      'success',
    );

    await supabaseAdmin.from('projects').update({ status: 'completed' }).eq('id', projectId);

    return NextResponse.json({ projectId, tasksCount: tasks.length });
  } catch (err) {
    console.error('[POST /api/project]', err);
    return NextResponse.json({ error: 'Erreur orchestration' }, { status: 500 });
  }
}
