import supabase from './db-client.js';
import { getProfile, requireProfile, isFactory, requireFactory } from './_auth.js';

// List user profiles. Factory sees all; dealer users see their own company's users.
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const { profile, error } = await getProfile(req, supabase);
    if (error) return res.status(401).json({ error });
    if (!requireProfile(profile, res)) return;

    if (req.method === 'GET') {
      let query = supabase.from('profiles').select('id,email,full_name,phone,role,dealer_id,outlet_id,status,created_at').order('created_at', { ascending: false });
      if (!isFactory(profile)) query = query.eq('dealer_id', profile.dealer_id);
      if (req.query.dealer_id) query = query.eq('dealer_id', req.query.dealer_id);
      const { data, error: qerr } = await query;
      if (qerr) throw qerr;
      return res.status(200).json(data || []);
    }

    res.status(405).json({ error: 'Метод не поддерживается' });
  } catch (err) {
    console.error('users error:', err);
    res.status(500).json({ error: err.message });
  }
}
