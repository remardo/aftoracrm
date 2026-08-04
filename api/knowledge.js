import supabase from './db-client.js';
import { getProfile, requireProfile, isFactory, requireFactory, logActivity } from './_auth.js';

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
      let query = supabase.from('knowledge_base').select('*').order('created_at', { ascending: false });
      if (req.query.category) query = query.eq('category', req.query.category);
      if (req.query.search) {
        const s = req.query.search;
        query = query.or(`title.ilike.%${s}%,content.ilike.%${s}%,tags.ilike.%${s}%`);
      }
      const { data, error: qerr } = await query;
      if (qerr) throw qerr;
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      if (!requireFactory(profile, res)) return;
      const { title, category, content, tags } = req.body;
      const { data, error: ierr } = await supabase.from('knowledge_base').insert({
        title, category: category || 'product', content, tags: tags || null,
        author_name: profile.full_name, views: 0, helpful: 0, not_helpful: 0,
      }).select().single();
      if (ierr) throw ierr;
      await logActivity(supabase, { user_email: user.email, user_name: profile.full_name, action: 'Добавлена статья базы знаний', entity_type: 'knowledge', entity_id: data.id, details: title });
      return res.status(201).json(data);
    }

    if (req.method === 'PUT') {
      const { id, helpful_vote, ...fields } = req.body;
      if (helpful_vote !== undefined) {
        const col = helpful_vote ? 'helpful' : 'not_helpful';
        const { data: cur } = await supabase.from('knowledge_base').select(col).eq('id', id).single();
        const next = (cur?.[col] || 0) + 1;
        const { data, error: uerr } = await supabase.from('knowledge_base').update({ [col]: next, views: ((cur?.views || 0)) }).eq('id', id).select().single();
        if (uerr) throw uerr;
        return res.status(200).json(data);
      }
      // update article fields (factory only)
      if (!requireFactory(profile, res)) return;
      const { data, error: uerr } = await supabase.from('knowledge_base').update({ ...fields, updated_at: new Date().toISOString() }).eq('id', id).select().single();
      if (uerr) throw uerr;
      return res.status(200).json(data);
    }

    res.status(405).json({ error: 'Метод не поддерживается' });
  } catch (err) {
    console.error('knowledge error:', err);
    res.status(500).json({ error: err.message });
  }
}
