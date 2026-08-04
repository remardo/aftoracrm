import supabase from './db-client.js';
import { getProfile, isFactory, requireFactory, requireProfile, logActivity } from './_auth.js';

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
      let query = supabase.from('dealers').select('*').order('created_at', { ascending: false });
      if (!isFactory(profile)) {
        // dealers only see their own company
        query = query.eq('id', profile.dealer_id);
      }
      if (req.query.status) query = query.eq('status', req.query.status);
      const { data, error: qerr } = await query;
      if (qerr) throw qerr;
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      if (!requireFactory(profile, res)) return;
      const { name, legal_name, inn, city, region, discount_rate, contact_email, contact_phone, manager_id, notes } = req.body;
      const { data, error: ierr } = await supabase.from('dealers').insert({
        name, legal_name, inn, city, region,
        discount_rate: discount_rate || 0,
        contact_email, contact_phone,
        manager_id: manager_id || null,
        notes: notes || null,
        status: 'active',
      }).select().single();
      if (ierr) throw ierr;
      await logActivity(supabase, { user_email: user.email, user_name: profile.full_name, action: 'Создан дилер', entity_type: 'dealer', entity_id: data.id, details: name });
      return res.status(201).json(data);
    }

    if (req.method === 'PUT') {
      if (!requireFactory(profile, res)) return;
      const { id, ...fields } = req.body;
      const { data, error: uerr } = await supabase.from('dealers').update(fields).eq('id', id).select().single();
      if (uerr) throw uerr;
      await logActivity(supabase, { user_email: user.email, user_name: profile.full_name, action: 'Изменён дилер', entity_type: 'dealer', entity_id: id, details: data.name });
      return res.status(200).json(data);
    }

    res.status(405).json({ error: 'Метод не поддерживается' });
  } catch (err) {
    console.error('dealers error:', err);
    res.status(500).json({ error: err.message });
  }
}
