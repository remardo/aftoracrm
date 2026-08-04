import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Card, PageHeader, Spinner, Stat, EmptyState, Badge } from '../components/ui';
import { ORDER_STATUS, TICKET_CATEGORY } from '../lib/constants';
import { money, dateShort } from '../lib/format';
import { TrendingUp, ShoppingCart, LifeBuoy, Sparkles, Building2, AlertTriangle, BookOpen, BarChart3 } from 'lucide-react';

export default function Statistics() {
  const [s, setS] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.get('/api/statistics').then(setS).catch(console.error).finally(() => setLoading(false)); }, []);

  if (loading) return <div className="flex justify-center py-24"><Spinner /></div>;
  if (!s) return <EmptyState icon={<BarChart3 size={36} />} title="Нет данных" />;

  const maxOrderStatus = Math.max(1, ...Object.values(s.ordersByStatus || {}).map((v: any) => Number(v)));
  const maxDealer = Math.max(1, ...(s.topDealers || []).map((d: any) => d.revenue));
  const maxTimeline = Math.max(1, ...(s.timeline || []).map((d: any) => Math.max(d.orders, d.tickets)));

  return (
    <div>
      <PageHeader title="Аналитика" subtitle="Сводка по дилерам, заказам, обращениям и эффективности ИИ-агента" />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat label="Дилеры" value={s.dealersTotal} hint={`${s.dealersActive} активных, ${s.dealersPending} ожидающих`} icon={<Building2 size={20} />} accent="amber" />
        <Stat label="Оборот" value={money(s.revenue)} hint={`${s.ordersTotal} заказов`} icon={<TrendingUp size={20} />} accent="green" />
        <Stat label="Обращения" value={s.ticketsTotal} hint={`${s.ticketsOpen} открыто`} icon={<LifeBuoy size={20} />} accent="blue" />
        <Stat label="Эффективность ИИ" value={`${s.aiDeflectionRate}%`} hint={`${s.aiResolved} решено автоматически`} icon={<Sparkles size={20} />} accent="purple" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Orders by status */}
        <Card className="p-5">
          <h3 className="font-semibold text-stone-800 mb-4 flex items-center gap-2"><ShoppingCart size={18} /> Заказы по статусам</h3>
          <div className="space-y-2.5">
            {Object.entries(ORDER_STATUS).filter(([k]) => k !== 'draft').map(([k, v]) => {
              const count = (s.ordersByStatus || {})[k] || 0;
              return (
                <div key={k} className="flex items-center gap-3">
                  <span className="text-xs text-stone-500 w-32 shrink-0">{v.label}</span>
                  <div className="flex-1 h-6 rounded-lg bg-stone-100 overflow-hidden"><div className="h-full bg-amber-500 rounded-lg flex items-center px-2 text-[11px] text-white font-medium" style={{ width: `${(count / maxOrderStatus) * 100}%` }}>{count > 0 && count}</div></div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Timeline */}
        <Card className="p-5">
          <h3 className="font-semibold text-stone-800 mb-4 flex items-center gap-2"><BarChart3 size={18} /> Активность за 7 дней</h3>
          <div className="flex items-end justify-between gap-2 h-40">
            {(s.timeline || []).map((d: any) => (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex flex-col items-center justify-end h-32 gap-0.5">
                  <div className="w-full max-w-[28px] bg-amber-500 rounded-t" style={{ height: `${(d.orders / maxTimeline) * 100}%` }} title={`Заказы: ${d.orders}`} />
                  <div className="w-full max-w-[28px] bg-sky-400 rounded-b" style={{ height: `${(d.tickets / maxTimeline) * 100}%` }} title={`Обращения: ${d.tickets}`} />
                </div>
                <span className="text-[10px] text-stone-400">{d.date.slice(5)}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs text-stone-500"><span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-500" /> Заказы</span><span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-sky-400" /> Обращения</span></div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Top dealers */}
        <Card className="p-5 lg:col-span-2">
          <h3 className="font-semibold text-stone-800 mb-4">Топ дилеров по обороту</h3>
          {(s.topDealers || []).length === 0 ? <p className="text-sm text-stone-400">Нет данных</p> : (
            <div className="space-y-3">
              {s.topDealers.map((d: any, i: number) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-stone-400 w-5">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between text-sm"><span className="text-stone-700 truncate">{d.dealer_name}</span><span className="font-semibold text-stone-800 ml-2">{money(d.revenue)}</span></div>
                    <div className="h-2 rounded-full bg-stone-100 mt-1 overflow-hidden"><div className="h-full bg-amber-500 rounded-full" style={{ width: `${(d.revenue / maxDealer) * 100}%` }} /></div>
                  </div>
                  <span className="text-xs text-stone-400 w-16 text-right">{d.orders} зак.</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Side stats */}
        <div className="space-y-6">
          <Card className="p-5">
            <h3 className="font-semibold text-stone-800 mb-4">Рекламации</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm"><span className="text-stone-500">Всего</span><span className="font-semibold">{s.claimsTotal}</span></div>
              <div className="flex justify-between text-sm"><span className="text-stone-500">В работе</span><span className="font-semibold text-amber-600">{s.claimsOpen}</span></div>
              <div className="flex justify-between text-sm"><span className="text-stone-500">Решено</span><span className="font-semibold text-emerald-600">{s.claimsByStatus?.resolved || 0}</span></div>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="font-semibold text-stone-800 mb-4 flex items-center gap-2"><BookOpen size={16} /> База знаний</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm"><span className="text-stone-500">Статей</span><span className="font-semibold">{s.knowledgeArticles}</span></div>
              <div className="flex justify-between text-sm"><span className="text-stone-500">Просмотров</span><span className="font-semibold">{s.knowledgeViews}</span></div>
              <div className="flex justify-between text-sm"><span className="text-stone-500">Полезных оценок</span><span className="font-semibold text-emerald-600">{s.knowledgeHelpful}</span></div>
            </div>
          </Card>
        </div>
      </div>

      {/* Tickets by category */}
      <Card className="p-5 mt-6">
        <h3 className="font-semibold text-stone-800 mb-4">Обращения по категориям</h3>
        <div className="flex flex-wrap gap-2">
          {Object.entries(TICKET_CATEGORY).map(([k, v]) => (
            <div key={k} className="rounded-xl border border-stone-200 px-3 py-2 text-sm flex items-center gap-2">
              <span className="text-stone-600">{v}</span>
              <Badge label={String((s.ticketsByCategory || {})[k] || 0)} color="amber" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
