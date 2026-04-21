import { NextRequest, NextResponse } from 'next/server';
import { orchestrateProject, callAgent } from '@/lib/claude';
import { supabaseAdmin, addProjectLog, getAllAgents } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { brief } = await req.json();

    if (!brief?.trim()) {
      return NextResponse.json({ error: 'brief requis' }, { status: 400 });
    }

    // Créer le projet en DB
    const { data: project, error: projErr } = await supabaseAdmin
      .from('projects')
      .insert({ title: brief.slice(0, 80), brief: brief.trim() })
      .select()
      .single();

    if (projErr || !project) {
      return NextResponse.json({ error: 'Erreur création projet' }, { status: 500 });
    }

    const projectId = project.id;

    // Log système : début
    await addProjectLog(projectId, 'Système', `Nouveau projet lancé : "${brief}"`, 'system');

    // Récupérer tous les agents
    const agents = await getAllAgents();

    // Orchestration : décomposer le brief en tâches
    await addProjectLog(projectId, 'Orchestrateur', 'Analyse du brief et décomposition en tâches...', 'thinking');

    const tasks = await orchestrateProject(brief, agents);

    await addProjectLog(
      projectId,
      'Orchestrateur',
      `${tasks.length} tâches identifiées pour : ${tasks.map(t => t.agentName).join(', ')}`,
      'system',
    );

    // Exécuter les tâches en séquence (pour pouvoir passer les outputs)
    const outputs: Record<string, string> = {};

    for (const task of tasks) {
      await addProjectLog(
        projectId,
        task.agentName,
        `Traitement de la tâche : ${task.task}`,
        'thinking',
        task.agentId,
      );

      // Construire le contexte avec les outputs précédents
      const previousOutputs = Object.entries(outputs)
        .map(([name, out]) => `### Output de ${name} :\n${out}`)
        .join('\n\n');

      const contextualMessage = previousOutputs
        ? `${task.task}\n\n## Contexte des équipes précédentes :\n${previousOutputs}`
        : task.task;

      const response = await callAgent(
        task.agentId,
        contextualMessage,
        projectId,
        `Tu travailles sur le projet : "${brief}"`,
      );

      outputs[task.agentName] = response.message;

      await addProjectLog(
        projectId,
        task.agentName,
        response.message,
        'output',
        task.agentId,
      );
    }

    // Log succès final
    await addProjectLog(
      projectId,
      'Système',
      `Projet complété avec succès. ${tasks.length} contributions d'agents.`,
      'success',
    );

    // Marquer le projet comme terminé
    await supabaseAdmin
      .from('projects')
      .update({ status: 'completed' })
      .eq('id', projectId);

    return NextResponse.json({ projectId, tasksCount: tasks.length });
  } catch (err) {
    console.error('[/api/project]', err);
    return NextResponse.json({ error: 'Erreur orchestration projet' }, { status: 500 });
  }
}

export async function GET() {
  const { data: projects } = await supabaseAdmin
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20);

  return NextResponse.json(projects ?? []);
}
