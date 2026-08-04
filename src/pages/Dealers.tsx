import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { Card, PageHeader, Button, Input, Field, Select, Spinner, EmptyState, Badge, Modal } from '../components/ui';
import { money } from '../lib/format';
import { Building2, Plus, Search, MapPin } from 'lucide-react';
import type { Row } from '../lib/types';

export default function Dealers() {
  const [dealers, setDealers] = useState<Row[]>([]);
  const [orders, setOrders] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', legal_name: '', inn: '', city: '', region: '', discount_rate: 0.15, contact_email: '', contact_phone: '', manager_id: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [d, o] = await Promise.all([api.get('/api/dealers'), api.get('/api/orders')]);
      setDealers(d || []); setOrders(o || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const stats = (id: number) => {
    const o = orders.filter(x => x.dealer_id === id && x.status !== 'cancelled');
    return { count: o.length, revenue: o.reduce((s, x) => s + Number(x.total_amount || 0), 0) };
  };

  const filtered = dealers.filter(d => (!search || d.name?.toLowerCase().includes(search.toLowerCase()) || d.city?.toLowerCase().includes(search.toLowerCase())) && (!status || d.status === status));

  const save = async () => {
    if (!form.name) { alert('Укажите название'); return; }
    setSaving(true);
    try { await api.post('/api/dealers', form); setCreating(false); setForm({ name: '', legal_name: '', inn: '', city: '', region: '', discount_rate: 0.15, contact_email: '', contact_phone: '', manager_id: '', notes: '' }); load(); }
    catch (e: any) { alert(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <PageHeader title="Дилеры" subtitle="Реестр компаний-партнёров, торговых точек и закреплённых менеджеров"
        actions={<Button onClick={() => setCreating(true)}><Plus size={16} /> Добавить дилера</Button>} />

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <Input className="pl-9" placeholder="Поиск по названию или городу" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={status} onChange={e => setStatus(e.target.value)} className="sm:w-48">
          <option value="">Любой статус</option>
          <option value="active">Активные</option>
          <option value="pending">Ожидающие</option>
          <option value="blocked">Заблокированные</option>
        </Select>
      </div>

      {loading ? <div className="flex justify-center py-16"><Spinner /></div> :
       filtered.length === 0 ? <EmptyState icon={<Building2 size={36} />} title="Дилеры не найдены" /> :
       <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
         {filtered.map(d => {
           const st = stats(d.id);
           return (
             <Link key={d.id} to={`/dealers/${d.id}`}>
               <Card className="p-5 hover:shadow-md hover:border-amber-300 transition h-full">
                 <div className="flex items-start justify-between">
                   <div>
                     <p className="font-semibold text-stone-800">{d.name}</p>
                     <p className="text-xs text-stone-400 flex items-center gap-1 mt-0.5"><MapPin size={12} /> {d.city}{d.region && `, ${d.region}`}</p>
                   </div>
                   <Badge label={d.status === 'active' ? 'Активен' : d.status === 'pending' ? 'Ожидает' : d.status === 'blocked' ? 'Заблок.' : d.status} color={d.status === 'active' ? 'green' : d.status === 'pending' ? 'amber' : 'red'} />
                 </div>
                 <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-stone-100 text-center">
                   <div><p className="text-lg font-bold text-stone-800">{st.count}</p><p className="text-xs text-stone-400">заказов</p></div>
                  <div className="col-span-2"><p className="text-lg font-bold text-stone-800">{money(st.revenue)}</p><p className="text-xs text-stone-400">оборот</p></div>
                 </div>
                 <div className="flex items-center justify-between mt-3 text-xs text-stone-500">
                   <span>Скидка {Math.round((d.discount_rate || 0) * 100)}%</span>
                   <span>ИНН {d.inn || '—'}</span>
                 </div>
               </Card>
             </Link>
           );
         })}
       </div>}

      <Modal open={creating} onClose={() => setCreating(false)} title="Новый дилер" size="lg">
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Название" required><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Юр. лицо"><Input value={form.legal_name} onChange={e => setForm({ ...form, legal_name: e.target.value })} /></Field>
            <Field label="ИНН"><Input value={form.inn} onChange={e => setForm({ ...form, inn: e.target.value })} /></Field>
            <Field label="Город"><Input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} /></Field>
            <Field label="Регион"><Input value={form.region} onChange={e => setForm({ ...form, region: e.target.value })} /></Field>
            <Field label="Скидка, %"><Input type="number" step="1" value={Math.round(form.discount_rate * 100)} onChange={e => setForm({ ...form, discount_rate: Number(e.target.value) / 100 })} /></Field>
            <Field label="Контактный email"><Input value={form.contact_email} onChange={e => setForm({ ...form, contact_email: e.target.value })} /></Field>
            <Field label="Контактный телефон"><Input value={form.contact_phone} onChange={e => setForm({ ...form, contact_phone: e.target.value })} /></Field>
          </div>
          <Field label="Ответственный менеджер фабрики (email)"><Input value={form.manager_id} onChange={e => setForm({ ...form, manager_id: e.target.value })} /></Field>
          <Field label="Заметки"><Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></Field>
          <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setCreating(false)}>Отмена</Button><Button onClick={save} disabled={saving}>{saving ? 'Сохранение…' : 'Создать'}</Button></div>
        </div>
      </Modal>
    </div>
  );
}
