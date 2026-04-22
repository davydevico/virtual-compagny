import Anthropic from '@anthropic-ai/sdk';
import {
  getAgentById,
  getLastMemories,
  saveMemory,
  type Agent,
} from './supabase';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const MODEL = 'claude-sonnet-4-20250514';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  role:    'user' | 'assistant';
  content: string;
}

export interface Delegation {
  agentName: string;
  agentRole: string;
  task:      string;
}

export interface AgentResponse {
  agentId:     string;
  agentName:   string;
  message:     string;
  delegations: Delegation[];
}

// ─── Wrapper principal ────────────────────────────────────────────────────────

/**
 * Appelle Claude en tant qu'un agent spécifique.
 * Charge la mémoire des 20 derniers échanges et sauvegarde la réponse.
 */
export async function callAgent(
  agentId:      string,
  userMessage:  string,
  projectId?:   string,
  extraContext?: string,
  options?: { saveUserMessage?: boolean; maxTokens?: number },
): Promise<AgentResponse> {
  const agent = await getAgentById(agentId);
  if (!agent) throw new Error(`Agent ${agentId} introuvable`);

  const memories = await getLastMemories(agentId, 10);
  const systemPrompt = buildSystemPrompt(agent, extraContext);

  const messages: ChatMessage[] = [
    ...memories.map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: userMessage },
  ];

  const response = await anthropic.messages.create({
    model:      MODEL,
    max_tokens: options?.maxTokens ?? 2048,
    system:     systemPrompt,
    messages,
  });

  const raw = response.content
    .filter(b => b.type === 'text')
    .map(b => (b as Anthropic.TextBlock).text)
    .join('');

  const { message: assistantMessage, delegations } = parseDelegations(raw);

  // Sauvegarder le message utilisateur seulement si c'est un vrai message CEO (pas un prompt interne)
  if (options?.saveUserMessage !== false) {
    await saveMemory(agentId, 'user', userMessage, projectId);
  }
  await saveMemory(agentId, 'assistant', assistantMessage, projectId);

  return { agentId, agentName: agent.name, message: assistantMessage, delegations };
}

/**
 * Appelle Claude en tant qu'agent avec une image (Claude Vision).
 * L'image est passée en base64 avec le message texte.
 */
export async function callAgentWithImage(
  agentId:       string,
  userMessage:   string,
  imageBase64:   string,
  imageMimeType: string,
  projectId?:    string,
  extraContext?:  string,
): Promise<AgentResponse> {
  const agent = await getAgentById(agentId);
  if (!agent) throw new Error(`Agent ${agentId} introuvable`);

  const memories   = await getLastMemories(agentId, 10);
  const systemPrompt = buildSystemPrompt(agent, extraContext);

  const historyMessages = memories.map(m => ({
    role:    m.role as 'user' | 'assistant',
    content: m.content,
  }));

  const validMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const;
  type ImageMime = typeof validMimeTypes[number];
  const safeMime: ImageMime = validMimeTypes.includes(imageMimeType as ImageMime)
    ? (imageMimeType as ImageMime)
    : 'image/jpeg';

  const response = await anthropic.messages.create({
    model:      MODEL,
    max_tokens: 2048,
    system:     systemPrompt,
    messages:   [
      ...historyMessages,
      {
        role:    'user',
        content: [
          {
            type:   'image',
            source: { type: 'base64', media_type: safeMime, data: imageBase64 },
          },
          { type: 'text', text: userMessage },
        ],
      },
    ],
  });

  const raw = response.content
    .filter(b => b.type === 'text')
    .map(b => (b as Anthropic.TextBlock).text)
    .join('');

  const { message: assistantMessage, delegations } = parseDelegations(raw);

  await saveMemory(agentId, 'user',      userMessage,      projectId);
  await saveMemory(agentId, 'assistant', assistantMessage, projectId);

  return { agentId, agentName: agent.name, message: assistantMessage, delegations };
}

/**
 * Appelle Claude directement avec un prompt système et des messages,
 * sans persistance de mémoire (utilisé pour l'orchestration interne).
 */
export async function callClaudeRaw(
  systemPrompt: string,
  messages:     ChatMessage[],
  maxTokens = 2048,
): Promise<string> {
  const response = await anthropic.messages.create({
    model:      MODEL,
    max_tokens: maxTokens,
    system:     systemPrompt,
    messages,
  });

  return response.content
    .filter(b => b.type === 'text')
    .map(b => (b as Anthropic.TextBlock).text)
    .join('');
}

/**
 * Construit le système prompt complet pour un agent.
 */
function buildSystemPrompt(agent: Agent, extraContext?: string): string {
  return `${agent.personality}

## Ta connaissance de SURGIFLOW
${agent.knowledge}

## Contexte de la conversation
Tu es ${agent.name}, ${agent.role} chez SURGIFLOW. Tu réponds en français, de façon professionnelle et dans le respect de ton persona.
Tu te souviens de tous tes échanges précédents avec le CEO (visibles dans l'historique).
${extraContext ? `\n## Contexte supplémentaire\n${extraContext}` : ''}

## Instructions générales
- Réponds toujours dans ton rôle et avec ton expertise
- Sois concret et actionnable dans tes réponses
- Utilise le contexte SURGIFLOW dans tes réponses

## HONNÊTETÉ ABSOLUE — Ce que tu es et ce que tu n'es pas
Tu es un agent IA consultatif. Tu PEUX :
- Analyser, planifier, architecturer, rédiger des specs
- Produire du vrai code prêt à copier-coller
- Écrire des configs, des tests, des scripts complets et fonctionnels
- Coordonner et briefer d'autres agents

Tu NE PEUX PAS et tu ne dois JAMAIS prétendre avoir :
- Exécuté du code, lancé des commandes
- Poussé sur GitHub ou déployé quoi que ce soit
- Fait tourner des tests en vrai
- Modifié des fichiers du projet

## Délégation d'équipe — RÈGLE ABSOLUE (managers uniquement)
Tu es un manager, PAS un exécutant. Tu ne fais JAMAIS le travail technique à la place de ton équipe.
Dès que le CEO valide une action concrète ("ok", "vas-y", "on attaque", "fais-le", "on fait ça", "go", etc.) :
1. Tu réponds BRIÈVEMENT (2-4 lignes max) en annonçant qui fait quoi
2. Tu DÉLÈGUES à CHAQUE personne concernée avec un bloc <DELEGATE> par agent :

<DELEGATE>{"agentName": "Prénom", "agentRole": "Rôle exact", "task": "Brief précis et complet pour cet agent"}</DELEGATE>

Tu peux et DOIS utiliser autant de blocs <DELEGATE> que nécessaire selon la complexité.
Pour un sprint complet : tu délègues à tous les membres de l'équipe concernés EN PARALLÈLE.

Exemples de délégation :
- Tests → Nina (QA Médical)
- Infrastructure / CI-CD → Samy (DevOps)
- Frontend → Léa (Développeuse Frontend)
- Backend → Omar (Développeur Backend)
- Design → Inès (Designer UI/UX Médical)

## FORMAT DE LIVRAISON OBLIGATOIRE — Quand tu synthétises le travail de ton équipe
Structure ta réponse EXACTEMENT comme ceci :

---
## 🎯 Mission : [nom de la mission]

### ✅ Ce que l'équipe a produit
[Liste des livrables par agent — 1 ligne par agent]

### 📋 Guide d'implémentation — Ce que tu dois faire, Davy

**Étape 1 — [Nom étape]**
\`\`\`bash
# commande exacte à coller dans le terminal
\`\`\`

**Étape 2 — Créer/modifier [chemin/fichier.ext]**
\`\`\`typescript
// code complet à coller
\`\`\`

[...autant d'étapes que nécessaire, dans l'ordre exact d'exécution]

### ⚡ Ordre d'exécution recommandé
1. [étape 1]
2. [étape 2]
...

### ✔️ Vérification
[Comment savoir que ça marche : commandes à lancer, résultats attendus]
---

Sois ULTRA PRÉCIS : chemins de fichiers exacts, commandes complètes, code fonctionnel.
Davy doit pouvoir tout exécuter de A à Z sans aucune ambiguïté.
`;
}

function parseDelegations(raw: string): { message: string; delegations: Delegation[] } {
  const regex = /<DELEGATE>([\s\S]*?)<\/DELEGATE>/g;
  const delegations: Delegation[] = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(raw)) !== null) {
    try {
      delegations.push(JSON.parse(match[1].trim()) as Delegation);
    } catch {
      // skip malformed block
    }
  }

  const message = raw.replace(/<DELEGATE>[\s\S]*?<\/DELEGATE>/g, '').trim();
  return { message, delegations };
}

// ─── Orchestration projet ─────────────────────────────────────────────────────

export interface ProjectTask {
  agentId:     string;
  agentName:   string;
  department:  string;
  task:        string;
}

/**
 * Demande à l'orchestrateur (COO/PM) de décomposer un brief en tâches.
 */
export async function orchestrateProject(
  brief:  string,
  agents: Agent[],
): Promise<ProjectTask[]> {
  const agentList = agents
    .map(a => `- ${a.name} (${a.role}, ${a.department}) [id: ${a.id}]`)
    .join('\n');

  const systemPrompt = `Orchestrateur SURGIFLOW. Décompose le brief en tâches JSON, 3 agents max.
Agents: ${agentList}
Format strict (JSON array uniquement, zéro markdown):
[{"agentId":"uuid","agentName":"Prénom","department":"Dept","task":"tâche courte"}]`;

  const raw = await callClaudeRaw(systemPrompt, [
    { role: 'user', content: `Brief: "${brief}"` },
  ], 512);

  try {
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const tasks = JSON.parse(cleaned) as ProjectTask[];
    // Limite à 3 agents pour tenir dans le timeout Netlify (26s)
    return tasks.slice(0, 3);
  } catch {
    throw new Error(`Erreur parsing orchestration : ${raw.slice(0, 200)}`);
  }
}

/**
 * Génère les demandes de recrutement d'un agent C-Level nouvellement recruté.
 */
export async function generateRecruitmentRequests(
  agent:   Agent,
  allRoles: string[],
): Promise<Array<{ role_needed: string; department: string; reason: string }>> {
  const systemPrompt = `Tu es ${agent.name}, ${agent.role} chez SURGIFLOW, qui vient d'être recruté.
${agent.personality}

Tu dois identifier les profils dont tu as besoin dans ton équipe.`;

  const raw = await callClaudeRaw(systemPrompt, [
    {
      role: 'user',
      content: `Tu viens d'être recruté en tant que ${agent.role}.
Identifie 2 à 4 profils que tu dois recruter dans ton équipe pour que SURGIFLOW fonctionne bien.
Les rôles déjà pourvus : ${allRoles.join(', ')}.

Retourne un JSON (tableau) :
[
  {
    "role_needed": "Titre du poste",
    "department": "Département",
    "reason": "Pourquoi ce profil est essentiel pour SURGIFLOW (2-3 phrases)"
  }
]
Retourne uniquement le JSON, sans markdown.`,
    },
  ], 1024);

  try {
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return [];
  }
}
