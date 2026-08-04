import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Card, PageHeader, Button, Badge, Spinner, EmptyState, Field, Select, Textarea } from '../components/ui';
import { ORDER_STATUS, ORDER_FLOW, isFactory, isDealer } from '../lib/constants';
import { money, dateShort, dateTime } from '../lib/format';
import { ArrowLeft, Download, Printer, AlertTriangle, Check } from 'lucide-react';
import type { Row } from '../lib/types';

export default function OrderDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { profile } = useAuth();
  const [order, setOrder] = useState<Row | null>(null);
  const [loading, setLoading] = useState(true);
  const [nextStatus, setNextStatus] = useState('');
  const [note, setNote] = useState('');
  const [updating, setUpdating] = useState(false);

  const load = async () => {
    try {
      const data = await api.get(`/api/orders?id=${id}`);
      setOrder(data);
    } catch (e: any) { console.error(e); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [id]);

  if (loading) return <div className="flex justify-center py-24"><Spinner /></div>;
  if (!order) return <EmptyState icon={<AlertTriangle size={36} />} title="Заказ не найден" action={<Link to="/orders"><Button><ArrowLeft size={16} /> К заказам</Button></Link>} />;

  const s = ORDER_STATUS[order.status] || { label: order.status, color: 'slate', step: -1 };
  const currentStep = ORDER_FLOW.indexOf(order.status);
  const canManage = isFactory(profile);
  const canCancel = isDealer(profile) && order.status === 'submitted';

  const allowedNext: Record<string, string[]> = {
    submitted: ['confirmed', 'cancelled'],
    confirmed: ['in_production', 'cancelled'],
    in_production: ['ready'],
    ready: ['shipped'],
    shipped: ['delivered'],
  };
  const nextOptions = allowedNext[order.status] || [];

  const updateStatus = async () => {
    if (!nextStatus) return;
    setUpdating(true);
    try { await api.put('/api/orders', { id: order.id, status: nextStatus, note }); await load(); setNextStatus(''); setNote(''); }
    catch (e: any) { alert(e.message); }
    finally { setUpdating(false); }
  };

  const cancelOrder = async () => {
    if (!confirm('Отменить заказ?')) return;
    try { await api.put('/api/orders', { id: order.id, status: 'cancelled', note: 'Отменён дилером' }); await load(); }
    catch (e: any) { alert(e.message); }
  };

  const downloadSpec = () => {
    const lines = [];
    lines.push('Фабрика межкомнатных дверей «Афтора»');
    lines.push('Спецификация к заказу ' + order.order_number);
    lines.push('');
    lines.push('Дилер: ' + order.dealer_name);
    lines.push('Создан: ' + dateTime(order.created_at));
    lines.push('Статус: ' + s.label);
    lines.push('');
    lines.push('Позиции:');
    (order.items || []).forEach((it: Row, i: number) => {
      lines.push(`${i + 1}. ${it.product_name} (${it.model_code}) — ${it.width}×${it.height}, ${it.color}, ${it.glass ? 'остекление' : 'глухая'}, ${it.quantity} шт × ${money(it.unit_price)} = ${money(it.unit_price * it.quantity)}${it.is_custom ? ' [НЕСТАНДАРТ]' : ''}`);
    });
    lines.push('');
    lines.push('Итого: ' + money(order.total_amount));
    if (order.comment) { lines.push(''); lines.push('Комментарий: ' + order.comment); }
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${order.order_number}-specification.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <button onClick={() => nav('/orders')} className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700 mb-4"><ArrowLeft size={16} /> К заказам</button>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-stone-800">{order.order_number}</h1>
            <Badge label={s.label} color={s.color} />
          </div>
          <p className="text-stone-500 text-sm mt-1">{isFactory(profile) && order.dealer_name + ' · '}{dateShort(order.created_at)} · {order.created_by_name}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={downloadSpec}><Download size={16} /> Спецификация</Button>
          <Button variant="ghost" onClick={() => window.print()}><Printer size={16} /> Печать</Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Timeline */}
          <Card className="p-5">
            <h3 className="font-semibold text-stone-800 mb-4">Отслеживание производства</h3>
            {order.status === 'cancelled' ? (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-rose-700 text-sm">Заказ отменён.</div>
            ) : (
              <div className="flex items-center justify-between">
                {ORDER_FLOW.map((st, i) => {
                  const meta = ORDER_STATUS[st];
                  const done = i <= currentStep;
                  const isCurrent = i === currentStep;
                  return (
                    <div key={st} className="flex-1 flex flex-col items-center relative">
                      {i > 0 && <div className={`absolute -left-1/2 top-3.5 w-full h-0.5 ${i <= currentStep ? 'bg-amber-500' : 'bg-stone-200'}`} />}
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs z-10 ${done ? 'bg-amber-500 text-white' : 'bg-stone-200 text-stone-400'} ${isCurrent ? 'ring-4 ring-amber-100' : ''}`}>
                        {done ? <Check size={14} /> : i + 1}
                      </div>
                      <p className={`text-[11px] text-center mt-1.5 ${done ? 'text-stone-700 font-medium' : 'text-stone-400'}`}>{meta.label}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Items */}
          <Card className="overflow-hidden">
            <div className="p-5 border-b border-stone-100"><h3 className="font-semibold text-stone-800">Позиции ({(order.items || []).length})</h3></div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-stone-50 text-stone-500 text-xs uppercase"><tr><th className="text-left px-4 py-2.5 font-medium">Продукт</th><th className="text-left px-4 py-2.5 font-medium">Комплектация</th><th className="text-left px-4 py-2.5 font-medium">Кол-во</th><th className="text-right px-4 py-2.5 font-medium">Цена</th><th className="text-right px-4 py-2.5 font-medium">Сумма</th></tr></thead>
                <tbody className="divide-y divide-stone-100">
                  {(order.items || []).map((it: Row) => (
                    <tr key={it.id}>
                      <td className="px-4 py-3"><p className="font-medium text-stone-800">{it.product_name}</p><p className="text-xs text-stone-400">{it.model_code}{it.is_custom && <span className="text-orange-600 ml-1">· нестандарт</span>}</p></td>
                      <td className="px-4 py-3 text-stone-600 text-xs">{it.width}×{it.height}<br />{it.color} · {it.glass ? 'остекление' : 'глухая'}</td>
                      <td className="px-4 py-3 text-stone-600">{it.quantity}</td>
                      <td className="px-4 py-3 text-right text-stone-600">{money(it.unit_price)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-stone-800">{money(it.unit_price * it.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr className="bg-stone-50"><td colSpan={4} className="px-4 py-3 text-right text-stone-500 font-medium">Итого</td><td className="px-4 py-3 text-right font-bold text-stone-800 text-base">{money(order.total_amount)}</td></tr></tfoot>
              </table>
            </div>
          </Card>

          {/* Status log */}
          <Card className="p-5">
            <h3 className="font-semibold text-stone-800 mb-4">История статусов</h3>
            <div className="space-y-3">
              {(order.log || []).map((l: Row) => (
                <div key={l.id} className="flex gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                  <div><p className="text-stone-700"><b>{ORDER_STATUS[l.status]?.label || l.status}</b>{l.note && <span className="text-stone-500"> — {l.note}</span>}</p><p className="text-xs text-stone-400">{dateTime(l.created_at)}</p></div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card className="p-5">
            <h3 className="font-semibold text-stone-800 mb-3">Информация</h3>
            <dl className="text-sm space-y-2">
              <Row2 k="Дилер" v={order.dealer_name} />
              <Row2 k="Создал" v={order.created_by_name} />
              <Row2 k="Дата создания" v={dateShort(order.created_at)} />
              <Row2 k="Согласован" v={dateShort(order.confirmed_at)} />
              <Row2 k="Готов" v={dateShort(order.ready_at)} />
              <Row2 k="Отгружен" v={dateShort(order.shipped_at)} />
              <Row2 k="Жел. доставка" v={dateShort(order.requested_delivery_date)} />
              <Row2 k="Комментарий" v={order.comment} />
            </dl>
          </Card>

          {canManage && nextOptions.length > 0 && (
            <Card className="p-5 border-amber-200">
              <h3 className="font-semibold text-stone-800 mb-3">Управление заказом</h3>
              <div className="space-y-3">
                <Field label="Изменить статус"><Select value={nextStatus} onChange={e => setNextStatus(e.target.value)}><option value="">Выберите…</option>{nextOptions.map(st => <option key={st} value={st}>{ORDER_STATUS[st]?.label}</option>)}</Select></Field>
                <Field label="Комментарий"><Textarea rows={2} value={note} onChange={e => setNote(e.target.value)} /></Field>
                <Button className="w-full" onClick={updateStatus} disabled={updating || !nextStatus}>Применить</Button>
              </div>
            </Card>
          )}
          {canCancel && (
            <Button variant="danger" className="w-full" onClick={cancelOrder}>Отменить заказ</Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Row2({ k, v }: { k: string; v?: string | null }) {
  return <div className="flex justify-between gap-3"><dt className="text-stone-400 shrink-0">{k}</dt><dd className="text-stone-700 text-right">{v || '—'}</dd></div>;
}
