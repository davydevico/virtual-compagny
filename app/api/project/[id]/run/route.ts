import { NextRequest, NextResponse } from 'next/server';
import { orchestrateProject, callAgent } from '@/lib/claude';
import { supabaseAdmin, addProjectLog, getAllAgents } from '@/lib/supabase';

export const maxDuration = 300;

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const projectId = params.id;

  try {
    const { data: project } = await supabaseAdmin
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (!project) {
      return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 });
    }

    const agents = await getAllAgents();

    if (agents.length === 0) {
      await addProjectLog(projectId, 'Système', 'Aucun agent disponible. Recrutez d\'abord votre équipe.', 'error');
      await supabaseAdmin.from('projects').update({ status: 'paused' }).eq('id', projectId);
      return NextResponse.json({ error: 'Aucun agent disponible' }, { status: 400 });
    }

    await addProjectLog(projectId, 'Orchestrateur', 'Analyse du brief et décomposition en tâches...', 'thinking');

    const tasks = await orchestrateProject(project.brief, agents);

    await addProjectLog(
      projectId,
      'Orchestrateur',
      `${tasks.length} tâche${tasks.length > 1 ? 's' : ''} identifiée${tasks.length > 1 ? 's' : ''} pour : ${tasks.map(t => t.agentName).join(', ')}`,
      'system',
    );

    const outputs: Record<string, string> = {};

    for (const task of tasks) {
      try {
        await addProjectLog(
          projectId,
          task.agentName,
          `Traitement : ${task.task}`,
          'thinking',
          task.agentId,
        );

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
          `Tu travailles sur le projet : "${project.brief}"`,
        );

        outputs[task.agentName] = response.message;

        await addProjectLog(
          projectId,
          task.agentName,
          response.message,
          'output',
          task.agentId,
        );
      } catch (taskErr) {
        console.error(`Erreur tâche ${task.agentName}:`, taskErr);
        await addProjectLog(
          projectId,
          task.agentName,
          `Erreur lors du traitement de la tâche : ${taskErr instanceof Error ? taskErr.message : 'Erreur inconnue'}`,
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

    await supabaseAdmin
      .from('projects')
      .update({ status: 'completed' })
      .eq('id', projectId);

    return NextResponse.json({ success: true, tasksCount: tasks.length });
  } catch (err) {
    console.error('[/api/project/[id]/run]', err);

    await addProjectLog(
      projectId,
      'Système',
      `Erreur critique : ${err instanceof Error ? err.message : 'Erreur inconnue'}`,
      'error',
    ).catch(() => {});

    await supabaseAdmin
      .from('projects')
      .update({ status: 'paused' })
      .eq('id', projectId)
      .then(() => {}, () => {});

    return NextResponse.json({ error: 'Erreur orchestration' }, { status: 500 });
  }
}
