import supabase from './db-client.js';
import { getProfile, requireProfile } from './_auth.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const { profile, error } = await getProfile(req, supabase);
    if (error) return res.status(401).json({ error });
    if (!requireProfile(profile, res)) return;

    if (req.method === 'GET') {
      const { data, error: qerr } = await supabase.from('collections').select('*').order('id', { ascending: true });
      if (qerr) throw qerr;
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      const { name, description, price_tier } = req.body;
      const { data, error: ierr } = await supabase.from('collections').insert({
        name, description, price_tier: price_tier || 'standard',
      }).select().single();
      if (ierr) throw ierr;
      return res.status(201).json(data);
    }

    res.status(405).json({ error: 'Метод не поддерживается' });
  } catch (err) {
    console.error('collections error:', err);
    res.status(500).json({ error: err.message });
  }
}
