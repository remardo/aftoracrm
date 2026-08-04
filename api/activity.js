import supabase from './db-client.js';
import { getProfile, requireProfile, isFactory } from './_auth.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const { user, profile, error } = await getProfile(req, supabase);
    if (error) return res.status(401).json({ error });
    if (!requireProfile(profile, res)) return;

    if (req.method === 'GET') {
      let query = supabase.from('activity_log').select('*').order('created_at', { ascending: false }).limit(100);
      // dealers only see activity related to their own company (by matching email of company users) — simplfy: dealers see their own actions
      if (!isFactory(profile)) {
        // gather emails of dealer's users
        const { data: users } = await supabase.from('profiles').select('email').eq('dealer_id', profile.dealer_id);
        const emails = (users || []).map(u => u.email);
        if (emails.length) {
          query = supabase.from('activity_log').select('*').in('user_email', emails).order('created_at', { ascending: false }).limit(100);
        } else {
          return res.status(200).json([]);
        }
      }
      const { data, error: qerr } = await query;
      if (qerr) throw qerr;
      return res.status(200).json(data || []);
    }

    res.status(405).json({ error: 'Метод не поддерживается' });
  } catch (err) {
    console.error('activity error:', err);
    res.status(500).json({ error: err.message });
  }
}
