import supabase from './db-client.js';
import { getProfile, isFactory, requireProfile, logActivity, notify, notifyDealerUsers } from './_auth.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const { user, profile, error } = await getProfile(req, supabase);
    if (error) return res.status(401).json({ error });
    if (!requireProfile(profile, res)) return;

    if (req.method === 'GET') {
      let query = supabase.from('tickets').select('*').order('created_at', { ascending: false });
      if (!isFactory(profile)) query = query.eq('dealer_id', profile.dealer_id);
      if (req.query.status) query = query.eq('status', req.query.status);
      const { data, error: qerr } = await query;
      if (qerr) throw qerr;
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      const { subject, category, priority, description, ai_response, ai_resolved, ai_conversation_id } = req.body;
      let dealer_id = req.body.dealer_id;
      let dealer_name = '';
      if (!isFactory(profile)) dealer_id = profile.dealer_id;
      if (dealer_id) {
        const { data: d } = await supabase.from('dealers').select('name').eq('id', dealer_id).single();
        dealer_name = d?.name || '';
      }
      const { count } = await supabase.from('tickets').select('*', { count: 'exact', head: true });
      const ticket_number = `TK-${String((count || 0) + 501)}`;
      const status = ai_resolved ? 'resolved' : 'open';
      const { data, error: ierr } = await supabase.from('tickets').insert({
        ticket_number, dealer_id, dealer_name,
        created_by: user.email, created_by_name: profile.full_name,
        subject, category: category || 'other', priority: priority || 'medium',
        status, description, ai_response: ai_response || null, ai_resolved: !!ai_resolved,
        escalated: !ai_resolved, ai_conversation_id: ai_conversation_id || null,
      }).select().single();
      if (ierr) throw ierr;
      // initial message (user description)
      await supabase.from('ticket_messages').insert({ ticket_id: data.id, author_email: user.email, author_role: 'dealer', author_name: profile.full_name, message: description });
      if (ai_response) {
        await supabase.from('ticket_messages').insert({ ticket_id: data.id, author_email: 'ai@aftora.ru', author_role: 'ai', author_name: 'ИИ-агент', message: ai_response });
      }
      if (!ai_resolved) {
        await notify(supabase, { target_role: 'factory_admin', title: 'Новое обращение', message: `${ticket_number}: ${subject}`, type: 'ticket', related_id: data.id });
      }
      await logActivity(supabase, { user_email: user.email, user_name: profile.full_name, action: ai_resolved ? 'Обращение решено ИИ' : 'Создано обращение', entity_type: 'ticket', entity_id: data.id, details: `${ticket_number}: ${subject}` });
      return res.status(201).json(data);
    }

    if (req.method === 'PUT') {
      const { id, status, assigned_to, resolution, priority } = req.body;
      const updates = { updated_at: new Date().toISOString() };
      if (status) updates.status = status;
      if (assigned_to !== undefined) updates.assigned_to = assigned_to;
      if (resolution !== undefined) updates.resolution = resolution;
      if (priority) updates.priority = priority;
      if (status === 'resolved' || status === 'closed') updates.resolved_at = new Date().toISOString();
      const { data: existing } = await supabase.from('tickets').select('dealer_id,ticket_number').eq('id', id).single();
      const { data, error: uerr } = await supabase.from('tickets').update(updates).eq('id', id).select().single();
      if (uerr) throw uerr;
      if (existing) await notifyDealerUsers(supabase, existing.dealer_id, { title: 'Обновление по обращению', message: `Обращение ${existing.ticket_number}: ${status || 'обновлено'}.`, type: 'ticket', related_id: id });
      await logActivity(supabase, { user_email: user.email, user_name: profile.full_name, action: 'Обращение обновлено', entity_type: 'ticket', entity_id: id, details: existing?.ticket_number });
      return res.status(200).json(data);
    }

    res.status(405).json({ error: 'Метод не поддерживается' });
  } catch (err) {
    console.error('tickets error:', err);
    res.status(500).json({ error: err.message });
  }
}
