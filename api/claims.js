import supabase from './db-client.js';
import { getProfile, isFactory, requireProfile, logActivity, notify, notifyDealerUsers } from './_auth.js';

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
      let query = supabase.from('claims').select('*').order('created_at', { ascending: false });
      if (!isFactory(profile)) query = query.eq('dealer_id', profile.dealer_id);
      if (req.query.status) query = query.eq('status', req.query.status);
      const { data, error: qerr } = await query;
      if (qerr) throw qerr;
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      const { order_id, order_number, product_name, defect_type, description, quantity } = req.body;
      let dealer_id = req.body.dealer_id;
      let dealer_name = '';
      if (!isFactory(profile)) dealer_id = profile.dealer_id;
      if (dealer_id) {
        const { data: d } = await supabase.from('dealers').select('name').eq('id', dealer_id).single();
        dealer_name = d?.name || '';
      }
      const { count } = await supabase.from('claims').select('*', { count: 'exact', head: true });
      const claim_number = `RM-${String((count || 0) + 201)}`;
      const { data, error: ierr } = await supabase.from('claims').insert({
        claim_number, dealer_id, dealer_name,
        order_id: order_id || null, order_number: order_number || null,
        created_by: user.email, created_by_name: profile.full_name,
        product_name, defect_type: defect_type || 'manufacturing', description, quantity: Number(quantity || 1),
        status: 'submitted',
      }).select().single();
      if (ierr) throw ierr;
      await notify(supabase, { target_role: 'factory_admin', title: 'Новая рекламация', message: `${claim_number}: ${product_name || 'продукция'} — ${defect_type}`, type: 'claim', related_id: data.id });
      await logActivity(supabase, { user_email: user.email, user_name: profile.full_name, action: 'Создана рекламация', entity_type: 'claim', entity_id: data.id, details: `${claim_number}: ${product_name}` });
      return res.status(201).json(data);
    }

    if (req.method === 'PUT') {
      const { id, status, resolution, compensation_amount, assigned_to } = req.body;
      const updates = {};
      if (status) updates.status = status;
      if (resolution !== undefined) updates.resolution = resolution;
      if (compensation_amount !== undefined) updates.compensation_amount = compensation_amount;
      if (assigned_to !== undefined) updates.assigned_to = assigned_to;
      if (['accepted', 'rejected', 'resolved'].includes(status)) updates.resolved_at = new Date().toISOString();
      const { data: existing } = await supabase.from('claims').select('dealer_id,claim_number').eq('id', id).single();
      const { data, error: uerr } = await supabase.from('claims').update(updates).eq('id', id).select().single();
      if (uerr) throw uerr;
      if (existing) await notifyDealerUsers(supabase, existing.dealer_id, { title: 'Обновление по рекламации', message: `Рекламация ${existing.claim_number}: ${status || 'обновлено'}.`, type: 'claim', related_id: id });
      await logActivity(supabase, { user_email: user.email, user_name: profile.full_name, action: 'Рекламация обновлена', entity_type: 'claim', entity_id: id, details: existing?.claim_number });
      return res.status(200).json(data);
    }

    res.status(405).json({ error: 'Метод не поддерживается' });
  } catch (err) {
    console.error('claims error:', err);
    res.status(500).json({ error: err.message });
  }
}
