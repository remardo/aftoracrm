import supabase from './db-client.js';
import { getProfile, isFactory, requireProfile } from './_auth.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const { user, profile, error } = await getProfile(req, supabase);
    if (error) return res.status(401).json({ error });
    if (!requireProfile(profile, res)) return;

    if (req.method === 'GET') {
      const { data: ticket } = await supabase.from('tickets').select('dealer_id').eq('id', req.query.ticket_id).single();
      if (!ticket || (!isFactory(profile) && ticket.dealer_id !== profile.dealer_id)) return res.status(403).json({ error: 'Нет доступа' });
      const { data, error: qerr } = await supabase.from('ticket_messages')
        .select('*').eq('ticket_id', req.query.ticket_id).order('created_at', { ascending: true });
      if (qerr) throw qerr;
      return res.status(200).json(data || []);
    }

    if (req.method === 'POST') {
      const { ticket_id, message } = req.body;
      const { data: ticket } = await supabase.from('tickets').select('dealer_id,status').eq('id', ticket_id).single();
      if (!ticket) return res.status(404).json({ error: 'Обращение не найдено' });
      if (!isFactory(profile) && ticket.dealer_id !== profile.dealer_id) return res.status(403).json({ error: 'Нет доступа' });
      const role = isFactory(profile) ? 'factory' : 'dealer';
      const { data, error: ierr } = await supabase.from('ticket_messages').insert({
        ticket_id, author_email: user.email, author_role: role, author_name: profile.full_name, message,
      }).select().single();
      if (ierr) throw ierr;
      // reopen ticket if it was resolved/closed and a new message arrives
      if (['resolved', 'closed'].includes(ticket.status)) {
        await supabase.from('tickets').update({ status: 'in_progress', updated_at: new Date().toISOString() }).eq('id', ticket_id);
      } else if (ticket.status === 'open') {
        await supabase.from('tickets').update({ status: 'in_progress', updated_at: new Date().toISOString() }).eq('id', ticket_id);
      }
      return res.status(201).json(data);
    }

    res.status(405).json({ error: 'Метод не поддерживается' });
  } catch (err) {
    console.error('ticket-messages error:', err);
    res.status(500).json({ error: err.message });
  }
}
