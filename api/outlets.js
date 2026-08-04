import supabase from './db-client.js';
import { getProfile, isFactory, requireProfile } from './_auth.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const { profile, error } = await getProfile(req, supabase);
    if (error) return res.status(401).json({ error });
    if (!requireProfile(profile, res)) return;

    if (req.method === 'GET') {
      let query = supabase.from('outlets').select('*').order('id', { ascending: true });
      if (req.query.dealer_id) query = query.eq('dealer_id', req.query.dealer_id);
      if (!isFactory(profile)) query = query.eq('dealer_id', profile.dealer_id);
      const { data, error: qerr } = await query;
      if (qerr) throw qerr;
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      const { dealer_id, name, address, city, phone } = req.body;
      let dId = dealer_id;
      if (!isFactory(profile)) dId = profile.dealer_id;
      if (!dId) return res.status(400).json({ error: 'Не указан дилер' });
      const { data, error: ierr } = await supabase.from('outlets').insert({
        dealer_id: dId, name, address, city, phone,
      }).select().single();
      if (ierr) throw ierr;
      return res.status(201).json(data);
    }

    if (req.method === 'PUT') {
      const { id, ...fields } = req.body;
      const { data, error: uerr } = await supabase.from('outlets').update(fields).eq('id', id).select().single();
      if (uerr) throw uerr;
      return res.status(200).json(data);
    }

    res.status(405).json({ error: 'Метод не поддерживается' });
  } catch (err) {
    console.error('outlets error:', err);
    res.status(500).json({ error: err.message });
  }
}
