import { createClient } from '@supabase/supabase-js';

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceKey   = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Client côté client (lecture publique)
export const supabase = createClient(supabaseUrl, supabaseAnon);

// Client serveur (service role — pour les API routes uniquement)
export const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Agent {
  id:          string;
  name:        string;
  role:        string;
  department:  string;
  avatar:      string;
  personality: string;
  knowledge:   string;
  manager_id:  string | null;
  status:      'active' | 'inactive' | 'on_mission';
  created_at:  string;
}

export interface Memory {
  id:         string;
  agent_id:   string;
  role:       'user' | 'assistant';
  content:    string;
  project_id: string | null;
  created_at: string;
}

export interface RecruitmentRequest {
  id:           string;
  requester_id: string;
  role_needed:  string;
  department:   string;
  reason:       string;
  status:       'pending' | 'approved' | 'rejected';
  created_at:   string;
  agents?:      Agent;
}

export interface Project {
  id:         string;
  title:      string;
  brief:      string;
  status:     'running' | 'completed' | 'paused';
  created_at: string;
}

export interface ProjectLog {
  id:         string;
  project_id: string;
  agent_id:   string | null;
  agent_name: string;
  message:    string;
  log_type:   'system' | 'thinking' | 'output' | 'success' | 'error';
  created_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export async function getAgentById(id: string): Promise<Agent | null> {
  const { data } = await supabaseAdmin
    .from('agents')
    .select('*')
    .eq('id', id)
    .single();
  return data;
}

export async function getLastMemories(agentId: string, limit = 20): Promise<Memory[]> {
  const { data } = await supabaseAdmin
    .from('memories')
    .select('*')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data ?? []).reverse();
}

export async function saveMemory(
  agentId:   string,
  role:      'user' | 'assistant',
  content:   string,
  projectId?: string,
): Promise<void> {
  await supabaseAdmin.from('memories').insert({
    agent_id:   agentId,
    role,
    content,
    project_id: projectId ?? null,
  });
}

export async function addProjectLog(
  projectId: string,
  agentName: string,
  message:   string,
  logType:   ProjectLog['log_type'],
  agentId?:  string,
): Promise<void> {
  await supabaseAdmin.from('project_logs').insert({
    project_id: projectId,
    agent_id:   agentId ?? null,
    agent_name: agentName,
    message,
    log_type:   logType,
  });
}

export async function getAllAgents(): Promise<Agent[]> {
  const { data } = await supabaseAdmin
    .from('agents')
    .select('*')
    .eq('status', 'active')
    .order('department');
  return data ?? [];
}

export async function getPendingRecruitments(): Promise<RecruitmentRequest[]> {
  const { data } = await supabaseAdmin
    .from('recruitment_requests')
    .select('*, agents!requester_id(*)')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  return data ?? [];
}
