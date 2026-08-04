import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Card, PageHeader, Button, Input, Textarea, Field, Select, Spinner, EmptyState, Badge, Tabs, Modal } from '../components/ui';
import { CLAIM_STATUS, DEFECT_TYPE, isDealer, isFactory } from '../lib/constants';
import { money, dateShort, dateTime } from '../lib/format';
import { AlertTriangle, Plus, Search } from 'lucide-react';
import type { Row } from '../lib/types';

const TABS = [
  { key: '', label: 'Все' },
  { key: 'submitted', label: 'Поданные' },
  { key: 'investigating', label: 'Расследуются' },
  { key: 'accepted', label: 'Принятые' },
  { key: 'resolved', label: 'Решённые' },
];
const DEFECTS = Object.entries(DEFECT_TYPE);

export default function Claims() {
  const { profile } = useAuth();
  const [items, setItems] = useState<Row[]>([]);
  const [orders, setOrders] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('');
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [active, setActive] = useState<Row | null>(null);
  const [form, setForm] = useState({ order_id: '', order_number: '', product_name: '', defect_type: 'manufacturing', description: '', quantity: 1 });
  const [ctrl, setCtrl] = useState({ status: '', resolution: '', compensation_amount: '', assigned_to: '' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (tab) params.set('status', tab);
      setItems(await api.get(`/api/claims?${params}`));
      if (isDealer(profile)) setOrders(await api.get('/api/orders'));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [tab]);

  const filtered = items.filter(c => !search || c.claim_number?.toLowerCase().includes(search.toLowerCase()) || c.product_name?.toLowerCase().includes(search.toLowerCase()));

  const openCreate = () => { setForm({ order_id: '', order_number: '', product_name: '', defect_type: 'manufacturing', description: '', quantity: 1 }); setCreating(true); };

  const save = async () => {
    if (!form.product_name || !form.description) { alert('Заполните продукт и описание'); return; }
    setSaving(true);
    try {
      const o = orders.find(x => String(x.id) === String(form.order_id));
      await api.post('/api/claims', { ...form, order_id: form.order_id || null, order_number: o?.order_number || '' });
      setCreating(false); load();
    } catch (e: any) { alert(e.message); }
    finally { setSaving(false); }
  };

  const openDetail = (c: Row) => { setActive(c); setCtrl({ status: c.status, resolution: c.resolution || '', compensation_amount: c.compensation_amount ?? '', assigned_to: c.assigned_to || '' }); };

  const saveCtrl = async () => {
    setSaving(true);
    try { await api.put('/api/claims', { id: active!.id, ...ctrl, compensation_amount: ctrl.compensation_amount === '' ? null : Number(ctrl.compensation_amount) }); setActive(null); load(); }
    catch (e: any) { alert(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <PageHeader title="Рекламации" subtitle="Оформление и отслеживание претензий по качеству, комплектации и транспортировке"
        actions={isDealer(profile) ? <Button onClick={openCreate}><Plus size={16} /> Оформить рекламацию</Button> : undefined} />

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      <div className="flex items-center gap-3 my-4">
        <div className="relative w-full max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <Input className="pl-9" placeholder="Поиск по номеру или продукту" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {loading ? <div className="flex justify-center py-16"><Spinner /></div> :
       filtered.length === 0 ? <EmptyState icon={<AlertTriangle size={36} />} title="Рекламаций нет" /> :
       <div className="space-y-3">
         {filtered.map(c => {
           const st = CLAIM_STATUS[c.status] || { label: c.status, color: 'slate' };
           return (
             <Card key={c.id} className="p-4 hover:shadow-md hover:border-amber-300 transition cursor-pointer" onClick={() => openDetail(c)}>
               <div className="flex items-center gap-4">
                 <div className="flex-1 min-w-0">
                   <div className="flex items-center gap-2 flex-wrap">
                     <span className="font-mono text-xs text-stone-400">{c.claim_number}</span>
                     <Badge label={DEFECT_TYPE[c.defect_type] || c.defect_type} color="orange" />
                   </div>
                   <p className="font-medium text-stone-800 mt-1 truncate">{c.product_name || 'Продукция не указана'}{c.order_number && <span className="text-stone-400 font-normal"> · заказ {c.order_number}</span>}</p>
                   <p className="text-xs text-stone-400 mt-0.5">{isFactory(profile) && (c.dealer_name + ' · ')}{c.created_by_name} · {dateShort(c.created_at)} · {c.quantity} шт</p>
                 </div>
                 <div className="flex flex-col items-end gap-1.5 shrink-0">
                   <Badge label={st.label} color={st.color} />
                   {c.compensation_amount != null && c.compensation_amount !== '' && <span className="text-xs text-stone-500">{money(c.compensation_amount)}</span>}
                 </div>
               </div>
             </Card>
           );
         })}
       </div>}

      {/* Create modal */}
      <Modal open={creating} onClose={() => setCreating(false)} title="Оформление рекламации" size="lg">
        <div className="space-y-4">
          {isDealer(profile) && orders.length > 0 && (
            <Field label="Заказ (необязательно)" hint="Если дефект по конкретному заказу"><Select value={form.order_id} onChange={e => setForm({ ...form, order_id: e.target.value })}><option value="">Без привязки к заказу</option>{orders.map(o => <option key={o.id} value={o.id}>{o.order_number} · {dateShort(o.created_at)}</option>)}</Select></Field>
          )}
          <Field label="Продукт / модель" required><Input value={form.product_name} onChange={e => setForm({ ...form, product_name: e.target.value })} placeholder="Напр. А-101 «Сонома»" /></Field>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Тип дефекта" required><Select value={form.defect_type} onChange={e => setForm({ ...form, defect_type: e.target.value })}>{DEFECTS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
            <Field label="Количество" required><Input type="number" min={1} value={form.quantity} onChange={e => setForm({ ...form, quantity: Number(e.target.value) })} /></Field>
          </div>
          <Field label="Описание дефекта" required hint="Опишите характер повреждения, обстоятельства, фото можно передать менеджеру"><Textarea rows={5} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></Field>
          <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setCreating(false)}>Отмена</Button><Button onClick={save} disabled={saving}>{saving ? 'Отправка…' : 'Подать рекламацию'}</Button></div>
        </div>
      </Modal>

      {/* Detail modal */}
      <Modal open={!!active} onClose={() => setActive(null)} title={`Рекламация ${active?.claim_number || ''}`} size="lg">
        {active && (
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <I k="Продукт" v={active.product_name} />
              <I k="Тип дефекта" v={DEFECT_TYPE[active.defect_type] || active.defect_type} />
              <I k="Заказ" v={active.order_number} />
              <I k="Количество" v={`${active.quantity} шт`} />
              <I k="Дилер" v={active.dealer_name} />
              <I k="Автор" v={active.created_by_name} />
              <I k="Создано" v={dateTime(active.created_at)} />
              <I k="Решено" v={active.resolved_at ? dateTime(active.resolved_at) : '—'} />
            </div>
            <div className="rounded-xl bg-stone-50 p-3 text-sm text-stone-700 whitespace-pre-line">{active.description}</div>
            {active.resolution && <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-800"><b>Решение:</b> {active.resolution}</div>}

            {isFactory(profile) && (
              <div className="border-t border-stone-100 pt-4 space-y-3">
                <h4 className="font-semibold text-stone-800 text-sm">Управление</h4>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Field label="Статус"><Select value={ctrl.status} onChange={e => setCtrl({ ...ctrl, status: e.target.value })}>{Object.entries(CLAIM_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</Select></Field>
                  <Field label="Компенсация, ₽"><Input type="number" value={ctrl.compensation_amount} onChange={e => setCtrl({ ...ctrl, compensation_amount: e.target.value })} /></Field>
                </div>
                <Field label="Ответственный (email)"><Input value={ctrl.assigned_to} onChange={e => setCtrl({ ...ctrl, assigned_to: e.target.value })} /></Field>
                <Field label="Решение / комментарий"><Textarea rows={3} value={ctrl.resolution} onChange={e => setCtrl({ ...ctrl, resolution: e.target.value })} /></Field>
                <Button onClick={saveCtrl} disabled={saving} className="w-full">Сохранить</Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

function I({ k, v }: { k: string; v?: string | null }) {
  return <div><p className="text-xs text-stone-400">{k}</p><p className="text-stone-700 font-medium">{v || '—'}</p></div>;
}
