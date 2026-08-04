import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Card, PageHeader, Input, Spinner, EmptyState, Badge } from '../components/ui';
import { dateTime } from '../lib/format';
import { History, Search } from 'lucide-react';
import type { Row } from '../lib/types';

const DOT: Record<string, string> = {
  order: 'bg-amber-500',
  ticket: 'bg-sky-500',
  claim: 'bg-rose-500',
  knowledge: 'bg-violet-500',
  dealer: 'bg-emerald-500',
};
const COLOR: Record<string, string> = {
  order: 'amber',
  ticket: 'blue',
  claim: 'red',
  knowledge: 'purple',
  dealer: 'green',
};

export default function Activity() {
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => { api.get<Row[]>('/api/activity').then(setItems).catch(console.error).finally(() => setLoading(false)); }, []);

  const filtered = items.filter(a => !search || a.action?.toLowerCase().includes(search.toLowerCase()) || a.user_name?.toLowerCase().includes(search.toLowerCase()) || a.details?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <PageHeader title="Журнал активности" subtitle="Единая история всех решений, обращений и изменений в системе" />

      <div className="relative w-full max-w-md mb-5">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
        <Input className="pl-9" placeholder="Поиск по действиям, пользователям, объектам" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? <div className="flex justify-center py-16"><Spinner /></div> :
       filtered.length === 0 ? <EmptyState icon={<History size={36} />} title="Записей нет" /> :
       <Card className="p-2">
         <div className="divide-y divide-stone-100">
           {filtered.map(a => (
             <div key={a.id} className="flex items-start gap-3 p-3.5">
               <div className={`w-2.5 h-2.5 rounded-full mt-2 shrink-0 ${DOT[a.entity_type] || 'bg-slate-400'}`} />
               <div className="flex-1 min-w-0">
                 <p className="text-sm text-stone-800"><b>{a.action}</b>{a.details && <span className="text-stone-500"> · {a.details}</span>}</p>
                 <p className="text-xs text-stone-400 mt-0.5">{a.user_name || a.user_email} · {dateTime(a.created_at)}</p>
               </div>
               {a.entity_type && <Badge label={a.entity_type} color={COLOR[a.entity_type] || 'slate'} />}
             </div>
           ))}
         </div>
       </Card>}
    </div>
  );
}
