import { NextRequest, NextResponse } from 'next/server';
import { generateRecruitmentRequests } from '@/lib/claude';
import { supabaseAdmin, getAllAgents } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { name, role, department, avatar, personality, knowledge } = await req.json();

    if (!name || !role || !department) {
      return NextResponse.json(
        { error: 'name, role et department sont requis' },
        { status: 400 },
      );
    }

    const { data: agent, error: agentErr } = await supabaseAdmin
      .from('agents')
      .insert({
        name,
        role,
        department,
        avatar:      avatar      ?? '🤖',
        personality: personality ?? `Tu es ${name}, ${role} chez SURGIFLOW.`,
        knowledge:   knowledge   ?? '',
        status:      'active',
      })
      .select()
      .single();

    if (agentErr || !agent) {
      return NextResponse.json({ error: 'Erreur création agent' }, { status: 500 });
    }

    const existingAgents = await getAllAgents();
    const existingRoles  = existingAgents.map(a => a.role);

    const recruitmentSuggestions = await generateRecruitmentRequests(agent, existingRoles);

    const requests = recruitmentSuggestions.map(s => ({
      requester_id: agent.id,
      role_needed:  s.role_needed,
      department:   s.department,
      reason:       s.reason,
      status:       'pending',
    }));

    if (requests.length > 0) {
      await supabaseAdmin.from('recruitment_requests').insert(requests);
    }

    return NextResponse.json({
      agent,
      recruitmentRequestsCreated: requests.length,
    });
  } catch (err) {
    console.error('[/api/recruit POST]', err);
    return NextResponse.json({ error: 'Erreur recrutement' }, { status: 500 });
  }
}

export async function GET() {
  const { data } = await supabaseAdmin
    .from('recruitment_requests')
    .select(`
      *,
      agents!requester_id (
        name,
        role,
        avatar,
        department
      )
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  return NextResponse.json(data ?? []);
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, action, agentData } = await req.json();

    if (!id || !action) {
      return NextResponse.json({ error: 'id et action requis' }, { status: 400 });
    }

    if (action === 'reject') {
      await supabaseAdmin
        .from('recruitment_requests')
        .update({ status: 'rejected' })
        .eq('id', id);
      return NextResponse.json({ success: true });
    }

    if (action === 'approve') {
      const { data: request } = await supabaseAdmin
        .from('recruitment_requests')
        .select('*')
        .eq('id', id)
        .single();

      if (!request) {
        return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 });
      }

      const { data: newAgent, error: agentErr } = await supabaseAdmin
        .from('agents')
        .insert({
          name:        agentData?.name       ?? request.role_needed,
          role:        request.role_needed,
          department:  request.department,
          avatar:      agentData?.avatar     ?? '🤖',
          personality: agentData?.personality ?? `Tu es ${request.role_needed} chez SURGIFLOW. ${request.reason}`,
          knowledge:   agentData?.knowledge  ?? '',
          manager_id:  request.requester_id,
          status:      'active',
        })
        .select()
        .single();

      if (agentErr || !newAgent) {
        return NextResponse.json({ error: 'Erreur création agent' }, { status: 500 });
      }

      await supabaseAdmin
        .from('recruitment_requests')
        .update({ status: 'approved' })
        .eq('id', id);

      return NextResponse.json({ success: true, agent: newAgent });
    }

    return NextResponse.json({ error: 'Action inconnue' }, { status: 400 });
  } catch (err) {
    console.error('[/api/recruit PATCH]', err);
    return NextResponse.json({ error: 'Erreur validation recrutement' }, { status: 500 });
  }
}
