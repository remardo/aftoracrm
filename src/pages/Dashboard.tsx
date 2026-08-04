import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { Card, PageHeader, Stat, Button, Spinner, EmptyState, Badge } from '../components/ui';
import { ORDER_STATUS, isFactory, isDealer } from '../lib/constants';
import { money, dateShort, dateTime } from '../lib/format';
import { ShoppingCart, LifeBuoy, AlertTriangle, Sparkles, Package, TrendingUp, Plus, BookOpen, ArrowRight, PackageCheck } from 'lucide-react';
import type { Row } from '../lib/types';

export default function Dashboard() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Row[]>([]);
  const [tickets, setTickets] = useState<Row[]>([]);
  const [claims, setClaims] = useState<Row[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [activity, setActivity] = useState<Row[]>([]);
  const [products, setProducts] = useState<Row[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [o, t, c] = await Promise.all([api.get('/api/orders'), api.get('/api/tickets'), api.get('/api/claims')]);
        setOrders(o); setTickets(t); setClaims(c);
        if (isFactory(profile)) {
          const [s, a] = await Promise.all([api.get('/api/statistics'), api.get('/api/activity')]);
          setStats(s); setActivity((a || []).slice(0, 8));
        }
        const pr = await api.get('/api/products?');
        setProducts((pr || []).slice(0, 4));
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [profile]);

  if (loading) return <div className="flex justify-center py-24"><Spinner /></div>;
  if (!profile) return null;

  const openTickets = tickets.filter(t => ['open', 'in_progress', 'escalated'].includes(t.status));
  const openClaims = claims.filter(c => ['submitted', 'investigating'].includes(c.status));
  const ordersToConfirm = isFactory(profile) ? orders.filter(o => o.status === 'submitted') : [];

  return (
    <div>
      <PageHeader
        title={`Здравствуйте, ${profile.full_name.split(' ')[0]}`}
        subtitle={isFactory(profile) ? 'Сводка по фабрике и дилерам' : isDealer(profile) ? 'Ваши заказы, обращения и инструменты' : ''}
        actions={isDealer(profile) ? (
          <>
            <Link to="/assistant"><Button variant="outline"><Sparkles size={16} /> ИИ-ассистент</Button></Link>
            <Link to="/orders/new"><Button><Plus size={16} /> Новый заказ</Button></Link>
          </>
        ) : null}
      />

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {isFactory(profile) && stats ? (
          <>
            <Stat label="Заказов на согласовании" value={stats.ordersByStatus?.submitted || 0} hint={`из ${stats.ordersTotal} всего`} icon={<ShoppingCart size={20} />} accent="amber" />
            <Stat label="Открытых обращений" value={stats.ticketsOpen} hint={`ИИ решил ${stats.aiResolved}`} icon={<LifeBuoy size={20} />} accent="blue" />
            <Stat label="Рекламаций в работе" value={stats.claimsOpen} hint={`из ${stats.claimsTotal}`} icon={<AlertTriangle size={20} />} accent="red" />
            <Stat label="Эффективность ИИ" value={`${stats.aiDeflectionRate}%`} hint="доля авто-решённых" icon={<Sparkles size={20} />} accent="purple" />
          </>
        ) : (
          <>
            <Stat label="Мои заказы" value={orders.length} hint={`${orders.filter(o => ['in_production', 'ready'].includes(o.status)).length} в производстве`} icon={<ShoppingCart size={20} />} />
            <Stat label="Открытые обращения" value={openTickets.length} hint={`${tickets.length} всего`} icon={<LifeBuoy size={20} />} accent="blue" />
            <Stat label="Рекламации" value={openClaims.length} hint={`${claims.length} всего`} icon={<AlertTriangle size={20} />} accent="red" />
            <Stat label="Доступно моделей" value={products.length ? '12+' : '—'} hint="в каталоге" icon={<Package size={20} />} accent="purple" />
          </>
        )}
      </div>

      {isFactory(profile) && ordersToConfirm.length > 0 && (
        <Card className="p-4 mb-6 border-amber-300 bg-amber-50/60">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <PackageCheck className="text-amber-600" size={20} />
              <p className="text-sm font-medium text-stone-800">Заказы, ожидающие согласования: {ordersToConfirm.length}</p>
            </div>
            <Link to="/orders"><Button size="sm" variant="subtle">Перейти к заказам <ArrowRight size={14} /></Button></Link>
          </div>
        </Card>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent orders */}
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-stone-800">Последние заказы</h3>
            <Link to="/orders" className="text-sm text-amber-600 hover:underline">Все</Link>
          </div>
          {orders.length === 0 ? (
            <EmptyState icon={<ShoppingCart size={32} />} title="Заказов пока нет" hint={isDealer(profile) ? 'Создайте первый заказ через конструктор.' : ''} action={isDealer(profile) ? <Link to="/orders/new"><Button size="sm"><Plus size={14} /> Создать заказ</Button></Link> : undefined} />
          ) : (
            <div className="divide-y divide-stone-100">
              {orders.slice(0, 5).map(o => (
                <Link key={o.id} to={`/orders/${o.id}`} className="flex items-center justify-between py-3 hover:bg-stone-50 -mx-2 px-2 rounded-lg">
                  <div>
                    <p className="font-medium text-stone-800 text-sm">{o.order_number}</p>
                    <p className="text-xs text-stone-400">{isFactory(profile) ? o.dealer_name : ''} · {dateShort(o.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-stone-700">{money(o.total_amount)}</span>
                    <Badge label={ORDER_STATUS[o.status]?.label || o.status} color={ORDER_STATUS[o.status]?.color || 'slate'} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>

        {/* Quick actions / activity */}
        <div className="space-y-6">
          {isDealer(profile) && (
            <Card className="p-5">
              <h3 className="font-semibold text-stone-800 mb-4">Быстрые действия</h3>
              <div className="space-y-2">
                <Link to="/assistant" className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 hover:border-amber-400">
                  <Sparkles className="text-amber-600" size={20} />
                  <div><p className="text-sm font-medium text-stone-800">Спросить ИИ-ассистента</p><p className="text-xs text-stone-500">подбор, статус, FAQ</p></div>
                </Link>
                <Link to="/catalog" className="flex items-center gap-3 p-3 rounded-xl hover:bg-stone-50 border border-stone-200">
                  <Package className="text-stone-600" size={20} />
                  <div><p className="text-sm font-medium text-stone-800">Каталог продукции</p><p className="text-xs text-stone-500">характеристики, наличие</p></div>
                </Link>
                <Link to="/knowledge" className="flex items-center gap-3 p-3 rounded-xl hover:bg-stone-50 border border-stone-200">
                  <BookOpen className="text-stone-600" size={20} />
                  <div><p className="text-sm font-medium text-stone-800">База знаний</p><p className="text-xs text-stone-500">инструкции и регламенты</p></div>
                </Link>
              </div>
            </Card>
          )}

          {isFactory(profile) && stats && (
            <Card className="p-5">
              <h3 className="font-semibold text-stone-800 mb-4">Топ дилеров</h3>
              <div className="space-y-3">
                {stats.topDealers?.slice(0, 5).map((d: any, i: number) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-bold text-stone-400 w-4">{i + 1}</span>
                      <span className="text-sm text-stone-700 truncate">{d.dealer_name}</span>
                    </div>
                    <span className="text-sm font-semibold text-stone-800">{money(d.revenue)}</span>
                  </div>
                ))}
                {(!stats.topDealers || stats.topDealers.length === 0) && <p className="text-sm text-stone-400">Нет данных</p>}
              </div>
            </Card>
          )}

          {isFactory(profile) && activity.length > 0 && (
            <Card className="p-5">
              <h3 className="font-semibold text-stone-800 mb-4">Лента активности</h3>
              <div className="space-y-3">
                {activity.map(a => (
                  <div key={a.id} className="text-sm">
                    <p className="text-stone-700">{a.action} {a.details && <span className="text-stone-500">· {a.details}</span>}</p>
                    <p className="text-xs text-stone-400">{a.user_name} · {dateTime(a.created_at)}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
