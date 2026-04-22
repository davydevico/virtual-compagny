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

    if (tasks.length === 0) {
      await addProjectLog(projectId, 'Système', "L'orchestrateur n'a assigné aucune tâche. Brief peut-être trop vague ou réponse Claude invalide.", 'error');
      await supabaseAdmin.from('projects').update({ status: 'paused' }).eq('id', projectId);
      return NextResponse.json({ error: 'Aucune tâche générée' }, { status: 400 });
    }

    await addProjectLog(
      projectId,
      'Orchestrateur',
      `${tasks.length} tâche${tasks.length > 1 ? 's' : ''} assignée${tasks.length > 1 ? 's' : ''} à : ${tasks.map(t => t.agentName).join(', ')}`,
      'system',
    );

    // Exécution parallèle de tous les agents
    const results = await Promise.allSettled(
      tasks.map(async (task) => {
        await addProjectLog(projectId, task.agentName, `Traitement : ${task.task}`, 'thinking', task.agentId);

        // Timeout de 22s par agent pour rester sous la limite Netlify (26s)
        const agentPromise = callAgent(
          task.agentId,
          task.task,
          projectId,
          `Tu travailles sur le projet : "${project.brief}"`,
          { maxTokens: 1024, saveUserMessage: false },
        );
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout agent (22s)')), 22_000),
        );
        const response = await Promise.race([agentPromise, timeoutPromise]);

        await addProjectLog(projectId, task.agentName, response.message, 'output', task.agentId);
        return { name: task.agentName, message: response.message };
      }),
    );

    const successes = results.filter(r => r.status === 'fulfilled').length;
    const failures  = results.filter(r => r.status === 'rejected');

    // Log chaque agent ayant échoué — visible dans l'UI
    await Promise.all(failures.map(async (r, i) => {
      const err = r.status === 'rejected' ? r.reason : null;
      const taskName = tasks[i]?.agentName ?? `Agent #${i}`;
      console.error(`Erreur agent ${taskName}:`, err);
      await addProjectLog(
        projectId,
        taskName,
        `Erreur : ${err instanceof Error ? err.message : String(err)}`,
        'error',
        tasks[i]?.agentId,
      ).catch(() => {});
    }));

    await addProjectLog(
      projectId,
      'Système',
      `✅ Mission complétée — ${successes} agent${successes > 1 ? 's' : ''} ont contribué.`,
      'success',
    );

    await supabaseAdmin
      .from('projects')
      .update({ status: 'completed' })
      .eq('id', projectId);

    return NextResponse.json({ success: true, tasksCount: tasks.length, successes });
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
