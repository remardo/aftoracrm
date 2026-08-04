import supabase from './db-client.js';
import { getProfile, isFactory, requireProfile } from './_auth.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const { profile, error } = await getProfile(req, supabase);
    if (error) return res.status(401).json({ error });
    if (!requireProfile(profile, res)) return;

    if (req.method === 'GET') {
      let query = supabase.from('order_items').select('*').eq('order_id', req.query.order_id).order('id', { ascending: true });
      const { data, error: qerr } = await query;
      if (qerr) throw qerr;
      return res.status(200).json(data || []);
    }

    if (req.method === 'POST') {
      const b = req.body;
      const { data: order } = await supabase.from('orders').select('dealer_id,status').eq('id', b.order_id).single();
      if (!order) return res.status(404).json({ error: 'Заказ не найден' });
      if (!isFactory(profile) && order.dealer_id !== profile.dealer_id) return res.status(403).json({ error: 'Нет доступа' });
      if (!['draft', 'submitted'].includes(order.status)) return res.status(400).json({ error: 'Заказ уже в работе, позиции нельзя менять' });
      const { data, error: ierr } = await supabase.from('order_items').insert({
        order_id: b.order_id, product_id: b.product_id || null, product_name: b.product_name, model_code: b.model_code || null,
        width: b.width, height: b.height, color: b.color, glass: !!b.glass, quantity: Number(b.quantity || 1),
        unit_price: Number(b.unit_price), is_custom: !!b.is_custom, custom_spec: b.custom_spec || null,
      }).select().single();
      if (ierr) throw ierr;
      // recalc total
      await recalcTotal(supabase, b.order_id);
      return res.status(201).json(data);
    }

    if (req.method === 'DELETE') {
      const { id } = req.body;
      const { data: item } = await supabase.from('order_items').select('order_id').eq('id', id).single();
      if (!item) return res.status(404).json({ error: 'Позиция не найдена' });
      const { data: order } = await supabase.from('orders').select('dealer_id,status').eq('id', item.order_id).single();
      if (!isFactory(profile) && order.dealer_id !== profile.dealer_id) return res.status(403).json({ error: 'Нет доступа' });
      if (!['draft', 'submitted'].includes(order.status)) return res.status(400).json({ error: 'Заказ уже в работе' });
      await supabase.from('order_items').delete().eq('id', id);
      await recalcTotal(supabase, item.order_id);
      return res.status(200).json({ ok: true });
    }

    res.status(405).json({ error: 'Метод не поддерживается' });
  } catch (err) {
    console.error('order-items error:', err);
    res.status(500).json({ error: err.message });
  }
}

async function recalcTotal(supabase, orderId) {
  const { data: items } = await supabase.from('order_items').select('unit_price,quantity').eq('order_id', orderId);
  const total = (items || []).reduce((s, i) => s + Number(i.unit_price) * Number(i.quantity), 0);
  await supabase.from('orders').update({ total_amount: total, updated_at: new Date().toISOString() }).eq('id', orderId);
}
