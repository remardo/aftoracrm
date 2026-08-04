import supabase from './db-client.js';
import { getProfile } from './_auth.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      const { user, profile, error } = await getProfile(req, supabase);
      if (error) return res.status(401).json({ error });
      if (!profile) {
        // Auto-provision new self-signups as a pending dealer admin so the portal is explorable.
        const { data: newProfile } = await supabase.from('profiles').insert({
          email: user.email,
          user_id: user.id,
          full_name: user.user_metadata?.full_name || user.email.split('@')[0],
          role: 'dealer_admin',
          status: 'pending',
        }).select().single();
        return res.status(200).json(newProfile);
      }
      return res.status(200).json(profile);
    }

    if (req.method === 'PUT') {
      const { user, profile, error } = await getProfile(req, supabase);
      if (error) return res.status(401).json({ error });
      const { full_name, phone } = req.body;
      const { data, error: uerr } = await supabase.from('profiles')
        .update({ full_name, phone }).eq('id', profile.id).select().single();
      if (uerr) throw uerr;
      return res.status(200).json(data);
    }

    res.status(405).json({ error: 'Метод не поддерживается' });
  } catch (err) {
    console.error('auth error:', err);
    res.status(500).json({ error: err.message });
  }
}
