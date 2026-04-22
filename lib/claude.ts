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
  agentId:    string;
  agentName:  string;
  message:    string;
  delegation?: Delegation;
}

// ─── Wrapper principal ────────────────────────────────────────────────────────

/**
 * Appelle Claude en tant qu'un agent spécifique.
 * Charge la mémoire des 20 derniers échanges et sauvegarde la réponse.
 */
export async function callAgent(
  agentId:    string,
  userMessage: string,
  projectId?:  string,
  extraContext?: string,
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
    max_tokens: 2048,
    system:     systemPrompt,
    messages,
  });

  const raw = response.content
    .filter(b => b.type === 'text')
    .map(b => (b as Anthropic.TextBlock).text)
    .join('');

  const { message: assistantMessage, delegation } = parseDelegation(raw);

  await saveMemory(agentId, 'user',      userMessage,      projectId);
  await saveMemory(agentId, 'assistant', assistantMessage, projectId);

  return { agentId, agentName: agent.name, message: assistantMessage, delegation };
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

  const { message: assistantMessage, delegation } = parseDelegation(raw);

  await saveMemory(agentId, 'user',      userMessage,      projectId);
  await saveMemory(agentId, 'assistant', assistantMessage, projectId);

  return { agentId, agentName: agent.name, message: assistantMessage, delegation };
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

## Instructions
- Réponds toujours dans ton rôle et avec ton expertise
- Sois concret et actionnable dans tes réponses
- Si tu as besoin d'informations supplémentaires, pose des questions précises
- Utilise le contexte SURGIFLOW dans tes réponses

## Délégation d'équipe — RÈGLE ABSOLUE
Tu es un manager, PAS un exécutant. Tu ne fais JAMAIS le travail technique à la place de ton équipe.
Dès que le CEO valide une action concrète ("ok", "vas-y", "on attaque", "fais-le", "on fait ça", "go", etc.) :
1. Tu réponds BRIÈVEMENT en confirmant qui prend en charge et pourquoi
2. Tu DÉLÈGUES OBLIGATOIREMENT à la bonne personne via ce bloc en fin de réponse :
<DELEGATE>{"agentName": "Prénom", "agentRole": "Rôle exact", "task": "Brief précis et complet de ce que tu lui demandes de faire"}</DELEGATE>

Exemples de délégation :
- Tests → Nina (QA Médical) ou Léa/Omar selon le contexte
- Infrastructure / CI-CD → Samy (DevOps)
- Frontend → Léa (Développeuse Frontend)
- Backend / Firebase → Omar (Développeur Backend)
- Design → Inès (Designer UI/UX Médical)

NE JAMAIS demander au CEO de copier-coller du code, faire du travail technique, ou exécuter des commandes.
Le CEO valide et décide. L'équipe exécute.
`;
}

function parseDelegation(raw: string): { message: string; delegation?: Delegation } {
  const match = raw.match(/<DELEGATE>([\s\S]*?)<\/DELEGATE>/);
  if (!match) return { message: raw };
  try {
    const delegation: Delegation = JSON.parse(match[1].trim());
    const message = raw.replace(/<DELEGATE>[\s\S]*?<\/DELEGATE>/, '').trim();
    return { message, delegation };
  } catch {
    return { message: raw };
  }
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

  const systemPrompt = `Tu es l'orchestrateur de SURGIFLOW Company OS.
Ton rôle : décomposer un brief CEO en tâches concrètes pour chaque équipe concernée.

## Agents disponibles :
${agentList}

## Instructions :
Retourne un JSON valide (tableau) avec exactement ce format :
[
  {
    "agentId": "uuid-de-l-agent",
    "agentName": "Prénom",
    "department": "Département",
    "task": "Description précise de la tâche pour cet agent"
  }
]

Ne réponds qu'avec le JSON, sans markdown, sans explication.
Sélectionne uniquement les agents pertinents pour le brief (3 à 6 agents max).`;

  const raw = await callClaudeRaw(systemPrompt, [
    { role: 'user', content: `Brief CEO : "${brief}"\n\nDécompose ce brief en tâches par agent.` },
  ], 1024);

  try {
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned) as ProjectTask[];
  } catch {
    throw new Error(`Erreur parsing orchestration : ${raw}`);
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
