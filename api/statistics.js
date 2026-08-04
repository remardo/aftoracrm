import supabase from './db-client.js';
import { getProfile, requireProfile, isFactory, requireAdmin } from './_auth.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const { profile, error } = await getProfile(req, supabase);
    if (error) return res.status(401).json({ error });
    if (!requireProfile(profile, res)) return;
    if (!isFactory(profile)) return res.status(403).json({ error: 'Аналитика доступна только фабрике' });

    if (req.method === 'GET') {
      const [dealers, orders, tickets, claims, knowledge, activity] = await Promise.all([
        supabase.from('dealers').select('id,name,city,status,discount_rate,created_at'),
        supabase.from('orders').select('id,dealer_id,dealer_name,status,total_amount,created_at'),
        supabase.from('tickets').select('id,category,status,ai_resolved,created_at,dealer_id'),
        supabase.from('claims').select('id,status,defect_type,created_at'),
        supabase.from('knowledge_base').select('id,category,views,helpful'),
        supabase.from('activity_log').select('id,action,created_at'),
      ]);

      const dList = dealers.data || [];
      const oList = orders.data || [];
      const tList = tickets.data || [];
      const cList = claims.data || [];
      const kList = knowledge.data || [];

      const ordersByStatus = {};
      oList.forEach(o => { ordersByStatus[o.status] = (ordersByStatus[o.status] || 0) + 1; });

      const revenue = oList.filter(o => o.status !== 'cancelled').reduce((s, o) => s + Number(o.total_amount || 0), 0);

      const ticketsByCategory = {};
      tList.forEach(t => { ticketsByCategory[t.category] = (ticketsByCategory[t.category] || 0) + 1; });

      const aiResolved = tList.filter(t => t.ai_resolved).length;
      const aiDeflectionRate = tList.length ? Math.round((aiResolved / tList.length) * 100) : 0;

      // top dealers by order count & revenue
      const byDealer = {};
      oList.forEach(o => {
        const key = o.dealer_id;
        if (!byDealer[key]) byDealer[key] = { dealer_name: o.dealer_name, orders: 0, revenue: 0 };
        byDealer[key].orders += 1;
        if (o.status !== 'cancelled') byDealer[key].revenue += Number(o.total_amount || 0);
      });
      const topDealers = Object.entries(byDealer).map(([id, v]) => ({ id: Number(id), ...v })).sort((a, b) => b.revenue - a.revenue).slice(0, 6);

      const claimsByStatus = {};
      cList.forEach(c => { claimsByStatus[c.status] = (claimsByStatus[c.status] || 0) + 1; });

      const knowledgeViews = kList.reduce((s, k) => s + (k.views || 0), 0);
      const knowledgeHelpful = kList.reduce((s, k) => s + (k.helpful || 0), 0);

      // last 7 days orders timeline
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        days.push({ date: key, orders: 0, tickets: 0 });
      }
      oList.forEach(o => { const key = (o.created_at || '').slice(0, 10); const d = days.find(x => x.date === key); if (d) d.orders += 1; });
      tList.forEach(t => { const key = (t.created_at || '').slice(0, 10); const d = days.find(x => x.date === key); if (d) d.tickets += 1; });

      return res.status(200).json({
        dealersTotal: dList.length,
        dealersActive: dList.filter(d => d.status === 'active').length,
        dealersPending: dList.filter(d => d.status === 'pending').length,
        ordersTotal: oList.length,
        ordersByStatus,
        revenue,
        ticketsTotal: tList.length,
        ticketsOpen: tList.filter(t => ['open', 'in_progress', 'escalated'].includes(t.status)).length,
        aiResolved,
        aiDeflectionRate,
        ticketsByCategory,
        claimsTotal: cList.length,
        claimsOpen: cList.filter(c => ['submitted', 'investigating'].includes(c.status)).length,
        claimsByStatus,
        topDealers,
        knowledgeArticles: kList.length,
        knowledgeViews,
        knowledgeHelpful,
        activityTotal: (activity.data || []).length,
        timeline: days,
      });
    }

    res.status(405).json({ error: 'Метод не поддерживается' });
  } catch (err) {
    console.error('statistics error:', err);
    res.status(500).json({ error: err.message });
  }
}
