import supabase from './db-client.js';
import { getProfile, requireProfile, requireFactory } from './_auth.js';

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
      // single product
      if (req.query.id) {
        const { data, error: qerr } = await supabase.from('products').select('*').eq('id', req.query.id).single();
        if (qerr) throw qerr;
        // increment views
        await supabase.rpc ? null : null;
        return res.status(200).json(data);
      }
      let query = supabase.from('products').select('*').order('id', { ascending: true });
      if (req.query.collection_id) query = query.eq('collection_id', req.query.collection_id);
      if (req.query.stock_status) query = query.eq('stock_status', req.query.stock_status);
      if (req.query.search) query = query.or(`name.ilike.%${req.query.search}%,model_code.ilike.%${req.query.search}%,material.ilike.%${req.query.search}%,finish.ilike.%${req.query.search}%`);
      const { data, error: qerr } = await query;
      if (qerr) throw qerr;
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      if (!requireFactory(profile, res)) return;
      const b = req.body;
      const { data, error: ierr } = await supabase.from('products').insert({
        collection_id: b.collection_id || null,
        collection_name: b.collection_name || null,
        name: b.name, model_code: b.model_code,
        material: b.material, finish: b.finish,
        width_options: b.width_options, height_options: b.height_options, color_options: b.color_options,
        glass: !!b.glass, base_price: b.base_price,
        stock_status: b.stock_status || 'in_stock',
        production_days: b.production_days || 7,
        specs: b.specs || {}, image_url: b.image_url || null,
      }).select().single();
      if (ierr) throw ierr;
      return res.status(201).json(data);
    }

    if (req.method === 'PUT') {
      if (!requireFactory(profile, res)) return;
      const { id, ...fields } = req.body;
      const { data, error: uerr } = await supabase.from('products').update(fields).eq('id', id).select().single();
      if (uerr) throw uerr;
      return res.status(200).json(data);
    }

    res.status(405).json({ error: 'Метод не поддерживается' });
  } catch (err) {
    console.error('products error:', err);
    res.status(500).json({ error: err.message });
  }
}
