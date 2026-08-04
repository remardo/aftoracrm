import supabase from './db-client.js';
import { getProfile, requireProfile, isFactory, requireFactory } from './_auth.js';

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
      const { data: modules } = await supabase.from('training_modules').select('*').order('order_index', { ascending: true });
      const { data: progress } = await supabase.from('training_progress').select('*').eq('user_email', user.email);
      return res.status(200).json({ modules: modules || [], progress: progress || [] });
    }

    if (req.method === 'POST') {
      const { module_id, status, score } = req.body;
      if (module_id) {
        // upsert progress for current user
        const { data: existing } = await supabase.from('training_progress').select('*').eq('user_email', user.email).eq('module_id', module_id).single();
        const payload = { user_email: user.email, module_id, status: status || 'in_progress', score: score ?? null, completed_at: (status === 'completed') ? new Date().toISOString() : null };
        if (existing) {
          const { data, error: uerr } = await supabase.from('training_progress').update(payload).eq('id', existing.id).select().single();
          if (uerr) throw uerr;
          return res.status(200).json(data);
        } else {
          const { data, error: ierr } = await supabase.from('training_progress').insert(payload).select().single();
          if (ierr) throw ierr;
          return res.status(201).json(data);
        }
      }
      // create module (factory only)
      if (!requireFactory(profile, res)) return;
      const { title, category, description, content, duration_min, order_index } = req.body;
      const { data, error: ierr } = await supabase.from('training_modules').insert({
        title, category, description, content, duration_min: duration_min || 10, order_index: order_index || 0,
      }).select().single();
      if (ierr) throw ierr;
      return res.status(201).json(data);
    }

    res.status(405).json({ error: 'Метод не поддерживается' });
  } catch (err) {
    console.error('training error:', err);
    res.status(500).json({ error: err.message });
  }
}
