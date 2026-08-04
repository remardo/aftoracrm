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
      // single order with items + status log
      if (req.query.id) {
        const { data: order, error: oerr } = await supabase.from('orders').select('*').eq('id', req.query.id).single();
        if (oerr) throw oerr;
        if (!isFactory(profile) && order.dealer_id !== profile.dealer_id) {
          return res.status(403).json({ error: 'Нет доступа к этому заказу' });
        }
        const { data: items } = await supabase.from('order_items').select('*').eq('order_id', order.id).order('id', { ascending: true });
        const { data: log } = await supabase.from('status_log').select('*').eq('order_id', order.id).order('created_at', { ascending: true });
        return res.status(200).json({ ...order, items: items || [], log: log || [] });
      }

      let query = supabase.from('orders').select('*').order('created_at', { ascending: false });
      if (!isFactory(profile)) query = query.eq('dealer_id', profile.dealer_id);
      if (req.query.status) query = query.eq('status', req.query.status);
      if (req.query.dealer_id) query = query.eq('dealer_id', req.query.dealer_id);
      const { data, error: qerr } = await query;
      if (qerr) throw qerr;
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      const { outlet_id, comment, requested_delivery_date, items, created_by_name } = req.body;
      let dealer_id = req.body.dealer_id;
      if (!isFactory(profile)) dealer_id = profile.dealer_id;
      if (!dealer_id) return res.status(400).json({ error: 'Профиль не привязан к дилеру. Обратитесь к руководству фабрики.' });
      if (!items || !items.length) return res.status(400).json({ error: 'Добавьте хотя бы одну позицию в заказ' });

      const { data: dealer } = await supabase.from('dealers').select('name,discount_rate').eq('id', dealer_id).single();
      const dealer_name = dealer?.name || '';

      const { count } = await supabase.from('orders').select('*', { count: 'exact', head: true });
      const year = new Date().getFullYear();
      const order_number = `AF-${year}-${String((count || 0) + 1001).slice(-4)}`;

      const total = items.reduce((s, i) => s + Number(i.unit_price) * Number(i.quantity || 1), 0);

      const { data: order, error: oerr } = await supabase.from('orders').insert({
        order_number, dealer_id, dealer_name,
        outlet_id: outlet_id || null,
        created_by: user.email, created_by_name: created_by_name || profile.full_name,
        status: 'submitted', total_amount: total,
        comment: comment || null,
        requested_delivery_date: requested_delivery_date || null,
      }).select().single();
      if (oerr) throw oerr;

      const itemRows = items.map(i => ({
        order_id: order.id, product_id: i.product_id || null,
        product_name: i.product_name, model_code: i.model_code || null,
        width: i.width, height: i.height, color: i.color,
        glass: !!i.glass, quantity: Number(i.quantity || 1),
        unit_price: Number(i.unit_price),
        is_custom: !!i.is_custom, custom_spec: i.custom_spec || null,
      }));
      const { error: ierr } = await supabase.from('order_items').insert(itemRows);
      if (ierr) throw ierr;

      await supabase.from('status_log').insert({ order_id: order.id, status: 'submitted', changed_by: user.email, note: 'Заказ создан и направлен на согласование' });
      await notify(supabase, { target_role: 'factory_admin', title: 'Новый заказ на согласование', message: `Заказ ${order_number} от дилера «${dealer_name}» на сумму ${total.toLocaleString('ru-RU')} ₽.`, type: 'order', related_id: order.id });
      await logActivity(supabase, { user_email: user.email, user_name: profile.full_name, action: 'Создан заказ', entity_type: 'order', entity_id: order.id, details: `${order_number} — ${itemRows.length} поз. на ${total.toLocaleString('ru-RU')} ₽` });
      return res.status(201).json(order);
    }

    if (req.method === 'PUT') {
      const { id, status, note } = req.body;
      if (!id || !status) return res.status(400).json({ error: 'Укажите id и status' });
      const { data: order } = await supabase.from('orders').select('dealer_id,order_number,dealer_name').eq('id', id).single();
      if (!order) return res.status(404).json({ error: 'Заказ не найден' });
      // only factory can change production statuses; dealers can cancel own submitted orders
      if (!isFactory(profile) && !['cancelled'].includes(status)) {
        return res.status(403).json({ error: 'Изменение статуса доступно только фабрике' });
      }
      const updates = { status, updated_at: new Date().toISOString() };
      const now = new Date().toISOString();
      if (status === 'confirmed') updates.confirmed_at = now;
      if (status === 'in_production') updates.confirmed_at = updates.confirmed_at || now;
      if (status === 'ready') updates.ready_at = now;
      if (status === 'shipped') updates.shipped_at = now;
      const { data, error: uerr } = await supabase.from('orders').update(updates).eq('id', id).select().single();
      if (uerr) throw uerr;
      await supabase.from('status_log').insert({ order_id: id, status, changed_by: user.email, note: note || '' });
      await notifyDealerUsers(supabase, order.dealer_id, { title: 'Статус заказа обновлён', message: `Заказ ${order.order_number}: ${statusLabel(status)}.`, type: 'order', related_id: id });
      await logActivity(supabase, { user_email: user.email, user_name: profile.full_name, action: 'Изменён статус заказа', entity_type: 'order', entity_id: id, details: `${order.order_number} → ${status}` });
      return res.status(200).json(data);
    }

    res.status(405).json({ error: 'Метод не поддерживается' });
  } catch (err) {
    console.error('orders error:', err);
    res.status(500).json({ error: err.message });
  }
}

function statusLabel(s) {
  const m = { submitted: 'На согласовании', confirmed: 'Согласован', in_production: 'В производстве', ready: 'Готов к отгрузке', shipped: 'Отгружен', delivered: 'Доставлен', cancelled: 'Отменён' };
  return m[s] || s;
}
