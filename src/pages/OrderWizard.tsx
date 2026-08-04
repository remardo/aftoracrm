import { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Card, PageHeader, Button, Input, Textarea, Field, Select, Spinner, EmptyState, Badge } from '../components/ui';
import { STOCK_STATUS } from '../lib/constants';
import { money } from '../lib/format';
import { Plus, Trash2, ShoppingCart, ArrowLeft, Search, CheckCircle2 } from 'lucide-react';
import type { Row } from '../lib/types';

interface Item {
  product_id: number | null; product_name: string; model_code: string;
  width: string; height: string; color: string; glass: boolean;
  quantity: number; unit_price: number; is_custom?: boolean; custom_spec?: string;
}

export default function OrderWizard() {
  const nav = useNavigate();
  const loc = useLocation() as any;
  const { profile } = useAuth();
  const [products, setProducts] = useState<Row[]>([]);
  const [outlets, setOutlets] = useState<Row[]>([]);
  const [dealer, setDealer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<Item[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Row | null>(null);
  const [cfg, setCfg] = useState({ width: '', height: '', color: '', glass: false, qty: 1, customSpec: '' });
  const [meta, setMeta] = useState({ outlet_id: '', comment: '', requested_delivery_date: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const discount = dealer?.discount_rate || 0;

  useEffect(() => {
    (async () => {
      try {
        const [p, ds] = await Promise.all([api.get('/api/products'), api.get('/api/dealers')]);
        setProducts(p || []);
        const me = (ds as Row[]).find(d => d.id === profile?.dealer_id);
        setDealer(me);
        if (profile?.dealer_id) {
          const o = await api.get(`/api/outlets?dealer_id=${profile.dealer_id}`);
          setOutlets(o || []);
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [profile?.dealer_id]);

  // prefill from ProductDetail
  useEffect(() => {
    if (loc.state?.product && cart.length === 0) {
      const pr = loc.state.product;
      setCart([{ product_id: pr.id, product_name: pr.name, model_code: pr.model_code || '', width: pr.width, height: pr.height, color: pr.color, glass: !!pr.glass, quantity: pr.quantity || 1, unit_price: pr.unit_price }]);
      window.history.replaceState({}, document.title);
    }
  }, [loc.state]);

  const pickProduct = (p: Row) => {
    setSelected(p);
    setCfg({ width: (p.width_options || '').split(',')[0]?.trim() || '', height: (p.height_options || '').split(',')[0]?.trim() || '', color: (p.color_options || '').split(',')[0]?.trim() || '', glass: !!p.glass, qty: 1, customSpec: '' });
  };

  const calcPrice = () => {
    if (!selected) return 0;
    const base = Number(selected.base_price || 0);
    const stdW = ['600', '700', '800', '900'].includes(cfg.width);
    const stdH = ['2000', '2100'].includes(cfg.height);
    const up = (!stdW || !stdH) ? base * 0.25 : 0;
    return Math.round((base + up) * (1 - discount));
  };

  const addItem = () => {
    if (!selected) return;
    const stdW = ['600', '700', '800', '900'].includes(cfg.width);
    const stdH = ['2000', '2100'].includes(cfg.height);
    const isCustom = !stdW || !stdH;
    setCart(c => [...c, {
      product_id: selected.id, product_name: selected.name, model_code: selected.model_code,
      width: cfg.width, height: cfg.height, color: cfg.color, glass: cfg.glass,
      quantity: cfg.qty, unit_price: calcPrice(), is_custom: isCustom, custom_spec: isCustom ? cfg.customSpec : undefined,
    }]);
    setSelected(null);
  };

  const removeItem = (i: number) => setCart(c => c.filter((_, idx) => idx !== i));

  const total = cart.reduce((s, it) => s + it.unit_price * it.quantity, 0);

  const submit = async () => {
    if (cart.length === 0) { setError('Добавьте хотя бы одну позицию'); return; }
    setSubmitting(true); setError('');
    try {
      const order = await api.post<Row>('/api/orders', {
        outlet_id: meta.outlet_id || null,
        comment: meta.comment,
        requested_delivery_date: meta.requested_delivery_date || null,
        items: cart,
      });
      nav(`/orders/${order.id}`);
    } catch (e: any) { setError(e.message); }
    finally { setSubmitting(false); }
  };

  if (loading) return <div className="flex justify-center py-24"><Spinner /></div>;

  return (
    <div>
      <button onClick={() => nav(-1)} className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700 mb-4"><ArrowLeft size={16} /> Назад</button>
      <PageHeader title="Конструктор заказа" subtitle="Подберите продукцию, проверьте комплектацию и отправьте на согласование" />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: product picker + cart */}
        <div className="lg:col-span-2 space-y-6">
          {/* Picker */}
          <Card className="p-5">
            <h3 className="font-semibold text-stone-800 mb-3">Добавить позицию</h3>
            {!selected ? (
              <>
                <div className="relative mb-3">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <Input className="pl-9" placeholder="Поиск продукции" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <div className="grid sm:grid-cols-2 gap-2 max-h-80 overflow-y-auto">
                  {products.filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.model_code.toLowerCase().includes(search.toLowerCase())).map(p => (
                    <button key={p.id} onClick={() => pickProduct(p)} className="text-left rounded-xl border border-stone-200 p-3 hover:border-amber-400 hover:bg-amber-50">
                      <p className="text-sm font-medium text-stone-800">{p.name}</p>
                      <p className="text-xs text-stone-400">{p.model_code} · {p.collection_name}</p>
                      <p className="text-sm font-semibold text-stone-700 mt-1">{money(p.base_price)}</p>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div><p className="font-medium text-stone-800">{selected.name}</p><p className="text-xs text-stone-400">{selected.model_code} · {selected.collection_name}</p></div>
                  <Button size="sm" variant="ghost" onClick={() => setSelected(null)}>Сменить</Button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <Field label="Ширина, мм"><Select value={cfg.width} onChange={e => setCfg({ ...cfg, width: e.target.value })}>{String(selected.width_options || '').split(',').map((s: string) => s.trim()).filter(Boolean).map((w: string) => <option key={w}>{w}</option>)}</Select></Field>
                  <Field label="Высота, мм"><Select value={cfg.height} onChange={e => setCfg({ ...cfg, height: e.target.value })}>{String(selected.height_options || '').split(',').map((s: string) => s.trim()).filter(Boolean).map((h: string) => <option key={h}>{h}</option>)}</Select></Field>
                  <Field label="Цвет"><Select value={cfg.color} onChange={e => setCfg({ ...cfg, color: e.target.value })}>{String(selected.color_options || '').split(',').map((s: string) => s.trim()).filter(Boolean).map((c: string) => <option key={c}>{c}</option>)}</Select></Field>
                  <Field label="Остекление"><Select value={cfg.glass ? '1' : '0'} onChange={e => setCfg({ ...cfg, glass: e.target.value === '1' })}><option value="0">Без стекла</option><option value="1">С остеклением</option></Select></Field>
                  <Field label="Количество"><Select value={cfg.qty} onChange={e => setCfg({ ...cfg, qty: Number(e.target.value) })}>{[1,2,3,4,5,6,8,10].map(n => <option key={n} value={n}>{n} шт</option>)}</Select></Field>
                  <div className="flex items-end">
                    <div className="w-full rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5 text-sm"><span className="text-stone-500">Цена/ед: </span><b className="text-stone-800">{money(calcPrice())}</b></div>
                  </div>
                </div>
                {!['600','700','800','900'].includes(cfg.width) || !['2000','2100'].includes(cfg.height) ? (
                  <div className="mt-3">
                    <Field label="Комментарий к нестандарту" hint="Будет передан на согласование"><Input value={cfg.customSpec} onChange={e => setCfg({ ...cfg, customSpec: e.target.value })} placeholder="Опишите нестандартное исполнение" /></Field>
                  </div>
                ) : null}
                <Button className="w-full mt-4" onClick={addItem}><Plus size={16} /> Добавить в заказ · {money(calcPrice() * cfg.qty)}</Button>
              </div>
            )}
          </Card>

          {/* Cart */}
          <Card className="p-5">
            <h3 className="font-semibold text-stone-800 mb-3">Позиции заказа ({cart.length})</h3>
            {cart.length === 0 ? <EmptyState icon={<ShoppingCart size={28} />} title="Добавьте позиции" hint="Выберите продукцию выше" /> : (
              <div className="divide-y divide-stone-100">
                {cart.map((it, i) => (
                  <div key={i} className="flex items-center gap-3 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-stone-800 truncate">{it.product_name} {it.is_custom && <Badge label="нестандарт" color="orange" />}</p>
                      <p className="text-xs text-stone-400">{it.width}×{it.height} · {it.color} · {it.glass ? 'стекло' : 'глухая'} · {it.quantity} шт</p>
                    </div>
                    <p className="text-sm font-semibold text-stone-700">{money(it.unit_price * it.quantity)}</p>
                    <button onClick={() => removeItem(i)} className="text-stone-400 hover:text-rose-600"><Trash2 size={16} /></button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right: summary */}
        <div>
          <Card className="p-5 sticky top-20">
            <h3 className="font-semibold text-stone-800 mb-4">Параметры заказа</h3>
            <div className="space-y-4">
              <Field label="Торговая точка"><Select value={meta.outlet_id} onChange={e => setMeta({ ...meta, outlet_id: e.target.value })}><option value="">Не указана</option>{outlets.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</Select></Field>
              <Field label="Желаемая дата доставки"><Input type="date" value={meta.requested_delivery_date} onChange={e => setMeta({ ...meta, requested_delivery_date: e.target.value })} /></Field>
              <Field label="Комментарий к заказу"><Textarea rows={3} value={meta.comment} onChange={e => setMeta({ ...meta, comment: e.target.value })} placeholder="Особые пожелания, упаковка, доставка…" /></Field>
              {discount > 0 && <p className="text-xs text-emerald-600">Применена дилерская скидка {Math.round(discount * 100)}%</p>}
              <div className="border-t border-stone-100 pt-4">
                <div className="flex justify-between text-sm text-stone-500"><span>Позиций</span><span>{cart.length}</span></div>
                <div className="flex justify-between text-lg font-bold text-stone-800 mt-1"><span>Итого</span><span>{money(total)}</span></div>
              </div>
              {error && <p className="text-sm text-rose-600">{error}</p>}
              <Button className="w-full" onClick={submit} disabled={submitting || cart.length === 0}><CheckCircle2 size={16} /> {submitting ? 'Отправка…' : 'Отправить на согласование'}</Button>
              <p className="text-xs text-stone-400 text-center">Заказ создастся со статусом «На согласовании»</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
