import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { Card, Button, Input, Field, Select, Textarea, Spinner, EmptyState, Badge, Modal } from '../components/ui';
import { ROLES } from '../lib/constants';
import { ORDER_STATUS, TICKET_STATUS, CLAIM_STATUS } from '../lib/constants';
import { money, dateShort } from '../lib/format';
import { ArrowLeft, Building2, Plus, Store, Users, Save } from 'lucide-react';
import type { Row } from '../lib/types';

export default function DealerDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [dealer, setDealer] = useState<Row | null>(null);
  const [outlets, setOutlets] = useState<Row[]>([]);
  const [users, setUsers] = useState<Row[]>([]);
  const [orders, setOrders] = useState<Row[]>([]);
  const [tickets, setTickets] = useState<Row[]>([]);
  const [claims, setClaims] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<Row | null>(null);
  const [outletForm, setOutletForm] = useState({ name: '', address: '', city: '', phone: '' });
  const [addingOutlet, setAddingOutlet] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const dealers = await api.get<Row[]>('/api/dealers');
      const d = dealers.find(x => String(x.id) === String(id)) || null;
      setDealer(d); setEdit(d);
      if (d) {
        const [o, u, or, t, c] = await Promise.all([
          api.get(`/api/outlets?dealer_id=${d.id}`),
          api.get(`/api/users?dealer_id=${d.id}`),
          api.get(`/api/orders?dealer_id=${d.id}`),
          api.get('/api/tickets'),
          api.get('/api/claims'),
        ]);
        setOutlets(o || []); setUsers(u || []); setOrders(or || []);
        setTickets((t || []).filter((x: Row) => x.dealer_id === d.id));
        setClaims((c || []).filter((x: Row) => x.dealer_id === d.id));
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [id]);

  if (loading) return <div className="flex justify-center py-24"><Spinner /></div>;
  if (!dealer) return <EmptyState icon={<Building2 size={36} />} title="Дилер не найден" action={<Link to="/dealers"><Button><ArrowLeft size={16} /> К дилерам</Button></Link>} />;

  const save = async () => {
    if (!edit) return;
    setSaving(true);
    try { await api.put('/api/dealers', { id: dealer.id, name: edit.name, city: edit.city, region: edit.region, discount_rate: edit.discount_rate, status: edit.status, manager_id: edit.manager_id, contact_email: edit.contact_email, contact_phone: edit.contact_phone, notes: edit.notes }); await load(); }
    catch (e: any) { alert(e.message); }
    finally { setSaving(false); }
  };

  const addOutlet = async () => {
    if (!outletForm.name) return;
    setSaving(true);
    try { await api.post('/api/outlets', { ...outletForm, dealer_id: dealer.id }); setOutletForm({ name: '', address: '', city: '', phone: '' }); setAddingOutlet(false); await load(); }
    catch (e: any) { alert(e.message); }
    finally { setSaving(false); }
  };

  const revenue = orders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + Number(o.total_amount || 0), 0);

  return (
    <div>
      <button onClick={() => nav('/dealers')} className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700 mb-4"><ArrowLeft size={16} /> К дилерам</button>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-stone-800">{dealer.name}</h1>
            <Badge label={dealer.status === 'active' ? 'Активен' : dealer.status === 'pending' ? 'Ожидает' : 'Заблокирован'} color={dealer.status === 'active' ? 'green' : dealer.status === 'pending' ? 'amber' : 'red'} />
          </div>
          <p className="text-stone-500 text-sm mt-1">{dealer.city}{dealer.region && `, ${dealer.region}`} · ИНН {dealer.inn || '—'}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="p-4"><p className="text-xs text-stone-400">Заказов</p><p className="text-xl font-bold text-stone-800 mt-1">{orders.length}</p></Card>
        <Card className="p-4"><p className="text-xs text-stone-400">Оборот</p><p className="text-xl font-bold text-stone-800 mt-1">{money(revenue)}</p></Card>
        <Card className="p-4"><p className="text-xs text-stone-400">Обращений</p><p className="text-xl font-bold text-stone-800 mt-1">{tickets.length}</p></Card>
        <Card className="p-4"><p className="text-xs text-stone-400">Рекламаций</p><p className="text-xl font-bold text-stone-800 mt-1">{claims.length}</p></Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="space-y-6">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-3"><h3 className="font-semibold text-stone-800">Реквизиты</h3><Button size="sm" variant="ghost" onClick={() => setEdit({ ...dealer })}>Изменить</Button></div>
            <dl className="text-sm space-y-2">
              <R k="Юр. лицо" v={dealer.legal_name} />
              <R k="ИНН" v={dealer.inn} />
              <R k="Город" v={dealer.city} />
              <R k="Регион" v={dealer.region} />
              <R k="Скидка" v={`${Math.round((dealer.discount_rate || 0) * 100)}%`} />
              <R k="Email" v={dealer.contact_email} />
              <R k="Телефон" v={dealer.contact_phone} />
              <R k="Отв. менеджер" v={dealer.manager_id} />
              <R k="Заметки" v={dealer.notes} />
            </dl>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between mb-3"><h3 className="font-semibold text-stone-800 flex items-center gap-2"><Store size={16} /> Торговые точки</h3><Button size="sm" variant="ghost" onClick={() => setAddingOutlet(true)}><Plus size={14} /> Добавить</Button></div>
            {outlets.length === 0 ? <p className="text-sm text-stone-400">Нет торговых точек</p> : (
              <div className="space-y-2">
                {outlets.map(o => (
                  <div key={o.id} className="rounded-xl border border-stone-200 p-3"><p className="text-sm font-medium text-stone-800">{o.name}</p><p className="text-xs text-stone-400">{o.address}{o.city && `, ${o.city}`}{o.phone && ` · ${o.phone}`}</p></div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card className="p-5">
            <h3 className="font-semibold text-stone-800 mb-3 flex items-center gap-2"><Users size={16} /> Пользователи дилера</h3>
            {users.length === 0 ? <p className="text-sm text-stone-400">Нет пользователей</p> : (
              <div className="divide-y divide-stone-100">
                {users.map(u => (
                  <div key={u.id} className="flex items-center justify-between py-3">
                    <div><p className="text-sm font-medium text-stone-800">{u.full_name}</p><p className="text-xs text-stone-400">{u.email}</p></div>
                    <Badge label={(ROLES as any)[u.role] || u.role} color="slate" />
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-5">
            <h3 className="font-semibold text-stone-800 mb-3">Последние заказы</h3>
            {orders.length === 0 ? <p className="text-sm text-stone-400">Заказов нет</p> : (
              <div className="divide-y divide-stone-100">
                {orders.slice(0, 6).map(o => {
                  const s = ORDER_STATUS[o.status] || { label: o.status, color: 'slate' };
                  return (
                    <Link key={o.id} to={`/orders/${o.id}`} className="flex items-center justify-between py-2.5 hover:bg-stone-50 -mx-2 px-2 rounded-lg">
                      <div><p className="text-sm font-medium text-amber-700">{o.order_number}</p><p className="text-xs text-stone-400">{dateShort(o.created_at)}</p></div>
                      <div className="flex items-center gap-3"><span className="text-sm font-semibold">{money(o.total_amount)}</span><Badge label={s.label} color={s.color} /></div>
                    </Link>
                  );
                })}
              </div>
            )}
          </Card>

          <div className="grid sm:grid-cols-2 gap-6">
            <Card className="p-5">
              <h3 className="font-semibold text-stone-800 mb-3">Обращения</h3>
              {tickets.length === 0 ? <p className="text-sm text-stone-400">Нет</p> : tickets.slice(0, 5).map(t => (
                <Link key={t.id} to={`/tickets/${t.id}`} className="block py-2 text-sm hover:text-amber-700">{t.ticket_number}: {t.subject}</Link>
              ))}
            </Card>
            <Card className="p-5">
              <h3 className="font-semibold text-stone-800 mb-3">Рекламации</h3>
              {claims.length === 0 ? <p className="text-sm text-stone-400">Нет</p> : claims.slice(0, 5).map(c => (
                <div key={c.id} className="py-2 text-sm">{c.claim_number}: {c.product_name}</div>
              ))}
            </Card>
          </div>
        </div>
      </div>

      {/* Edit modal */}
      <Modal open={!!edit} onClose={() => setEdit(null)} title="Редактировать дилера" size="lg">
        {edit && (
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Название"><Input value={edit.name || ''} onChange={e => setEdit({ ...edit, name: e.target.value })} /></Field>
              <Field label="Статус"><Select value={edit.status || 'active'} onChange={e => setEdit({ ...edit, status: e.target.value })}><option value="active">Активен</option><option value="pending">Ожидает</option><option value="blocked">Заблокирован</option></Select></Field>
              <Field label="Город"><Input value={edit.city || ''} onChange={e => setEdit({ ...edit, city: e.target.value })} /></Field>
              <Field label="Скидка, %"><Input type="number" value={Math.round((edit.discount_rate || 0) * 100)} onChange={e => setEdit({ ...edit, discount_rate: Number(e.target.value) / 100 })} /></Field>
              <Field label="Контактный email"><Input value={edit.contact_email || ''} onChange={e => setEdit({ ...edit, contact_email: e.target.value })} /></Field>
              <Field label="Контактный телефон"><Input value={edit.contact_phone || ''} onChange={e => setEdit({ ...edit, contact_phone: e.target.value })} /></Field>
            </div>
            <Field label="Ответственный менеджер (email)"><Input value={edit.manager_id || ''} onChange={e => setEdit({ ...edit, manager_id: e.target.value })} /></Field>
            <Field label="Заметки"><Textarea rows={2} value={edit.notes || ''} onChange={e => setEdit({ ...edit, notes: e.target.value })} /></Field>
            <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setEdit(null)}>Отмена</Button><Button onClick={save} disabled={saving}><Save size={16} /> {saving ? 'Сохранение…' : 'Сохранить'}</Button></div>
          </div>
        )}
      </Modal>

      {/* Add outlet modal */}
      <Modal open={addingOutlet} onClose={() => setAddingOutlet(false)} title="Новая торговая точка">
        <div className="space-y-4">
          <Field label="Название" required><Input value={outletForm.name} onChange={e => setOutletForm({ ...outletForm, name: e.target.value })} /></Field>
          <Field label="Адрес"><Input value={outletForm.address} onChange={e => setOutletForm({ ...outletForm, address: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Город"><Input value={outletForm.city} onChange={e => setOutletForm({ ...outletForm, city: e.target.value })} /></Field>
            <Field label="Телефон"><Input value={outletForm.phone} onChange={e => setOutletForm({ ...outletForm, phone: e.target.value })} /></Field>
          </div>
          <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setAddingOutlet(false)}>Отмена</Button><Button onClick={addOutlet} disabled={saving}>Добавить</Button></div>
        </div>
      </Modal>
    </div>
  );
}

function R({ k, v }: { k: string; v?: string | null }) {
  return <div className="flex justify-between gap-3"><dt className="text-stone-400 shrink-0">{k}</dt><dd className="text-stone-700 text-right">{v || '—'}</dd></div>;
}
