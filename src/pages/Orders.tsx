import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Card, PageHeader, Button, Input, Spinner, EmptyState, Badge, Tabs } from '../components/ui';
import { ORDER_STATUS, isDealer, isFactory } from '../lib/constants';
import { money, dateShort } from '../lib/format';
import { ShoppingCart, Plus, Search } from 'lucide-react';
import type { Row } from '../lib/types';

const TABS = [
  { key: '', label: 'Все' },
  { key: 'submitted', label: 'На согласовании' },
  { key: 'in_production', label: 'В производстве' },
  { key: 'ready', label: 'Готовы' },
  { key: 'shipped', label: 'Отгружены' },
  { key: 'delivered', label: 'Доставлены' },
];

export default function Orders() {
  const { profile } = useAuth();
  const [orders, setOrders] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('');
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (tab) params.set('status', tab);
      setOrders(await api.get(`/api/orders?${params}`));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [tab]);

  const filtered = orders.filter(o => !search || o.order_number?.toLowerCase().includes(search.toLowerCase()) || o.dealer_name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <PageHeader title="Заказы" subtitle={isFactory(profile) ? 'Все заказы дилеров и производство' : 'Заказы вашей компании и отслеживание производства'}
        actions={isDealer(profile) ? <Link to="/orders/new"><Button><Plus size={16} /> Новый заказ</Button></Link> : undefined} />

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      <div className="flex justify-between items-center gap-3 my-4">
        <div className="relative w-full max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <Input className="pl-9" placeholder="Поиск по номеру или дилеру" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {loading ? <div className="flex justify-center py-16"><Spinner /></div> :
       filtered.length === 0 ? <EmptyState icon={<ShoppingCart size={36} />} title="Заказов нет" hint="В этой категории пока пусто" /> :
       <Card className="overflow-hidden">
         <div className="overflow-x-auto">
           <table className="w-full text-sm">
             <thead className="bg-stone-50 text-stone-500 text-xs uppercase">
               <tr>
                 <th className="text-left px-4 py-3 font-medium">Номер</th>
                 {isFactory(profile) && <th className="text-left px-4 py-3 font-medium">Дилер</th>}
                 <th className="text-left px-4 py-3 font-medium">Создан</th>
                 <th className="text-left px-4 py-3 font-medium">Сумма</th>
                 <th className="text-left px-4 py-3 font-medium">Статус</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-stone-100">
               {filtered.map(o => {
                 const s = ORDER_STATUS[o.status] || { label: o.status, color: 'slate' };
                 return (
                   <tr key={o.id} className="hover:bg-stone-50">
                     <td className="px-4 py-3"><Link to={`/orders/${o.id}`} className="font-medium text-amber-700 hover:underline">{o.order_number}</Link></td>
                     {isFactory(profile) && <td className="px-4 py-3 text-stone-600">{o.dealer_name}</td>}
                     <td className="px-4 py-3 text-stone-500">{dateShort(o.created_at)}</td>
                     <td className="px-4 py-3 font-semibold text-stone-800">{money(o.total_amount)}</td>
                     <td className="px-4 py-3"><Badge label={s.label} color={s.color} /></td>
                   </tr>
                 );
               })}
             </tbody>
           </table>
         </div>
       </Card>}
    </div>
  );
}
