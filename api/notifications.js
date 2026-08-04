import supabase from './db-client.js';
import { getProfile, requireProfile } from './_auth.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const { user, profile, error } = await getProfile(req, supabase);
    if (error) return res.status(401).json({ error });
    if (!requireProfile(profile, res)) return;

    if (req.method === 'GET') {
      // notifications addressed to me, or to my role, or broadcast
      const { data, error: qerr } = await supabase.from('notifications')
        .select('*')
        .or(`user_email.eq.${user.email},target_role.eq.${profile.role},target_role.is.null`)
        .order('created_at', { ascending: false })
        .limit(50);
      if (qerr) throw qerr;
      return res.status(200).json(data || []);
    }

    if (req.method === 'PUT') {
      const { id, all } = req.body;
      if (all) {
        const { error: uerr } = await supabase.from('notifications').update({ read: true }).or(`user_email.eq.${user.email},target_role.eq.${profile.role}`).eq('read', false);
        if (uerr) throw uerr;
        return res.status(200).json({ ok: true });
      }
      const { error: uerr } = await supabase.from('notifications').update({ read: true }).eq('id', id);
      if (uerr) throw uerr;
      return res.status(200).json({ ok: true });
    }

    res.status(405).json({ error: 'Метод не поддерживается' });
  } catch (err) {
    console.error('notifications error:', err);
    res.status(500).json({ error: err.message });
  }
}
