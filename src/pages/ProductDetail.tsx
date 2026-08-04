import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { Card, PageHeader, Button, Badge, Field, Select, Spinner, EmptyState } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { STOCK_STATUS, isDealer } from '../lib/constants';
import { money } from '../lib/format';
import { ArrowLeft, ShoppingCart, CheckCircle2, AlertTriangle, Sparkles, Ruler } from 'lucide-react';
import type { Row } from '../lib/types';

export default function ProductDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { profile } = useAuth();
  const [p, setP] = useState<Row | null>(null);
  const [loading, setLoading] = useState(true);
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [color, setColor] = useState('');
  const [glass, setGlass] = useState(false);
  const [qty, setQty] = useState(1);
  const [dealer, setDealer] = useState<any>(null);
  const [check, setCheck] = useState<null | { ok: boolean; price: number; days: number; note?: string }>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.get(`/api/products?id=${id}`);
        setP(data);
        setWidth((data.width_options || '').split(',')[0]?.trim() || '');
        setHeight((data.height_options || '').split(',')[0]?.trim() || '');
        setColor((data.color_options || '').split(',')[0]?.trim() || '');
        setGlass(!!data.glass);
        if (profile?.dealer_id) {
          const ds = await api.get('/api/dealers');
          setDealer((ds as Row[]).find(d => d.id === profile.dealer_id) || null);
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [id, profile?.dealer_id]);

  if (loading) return <div className="flex justify-center py-24"><Spinner /></div>;
  if (!p) return <EmptyState icon={<AlertTriangle size={36} />} title="Продукт не найден" action={<Link to="/catalog"><Button><ArrowLeft size={16} /> В каталог</Button></Link>} />;

  const widths = String(p.width_options || '').split(',').map((s: string) => s.trim()).filter(Boolean);
  const heights = String(p.height_options || '').split(',').map((s: string) => s.trim()).filter(Boolean);
  const colors = String(p.color_options || '').split(',').map((s: string) => s.trim()).filter(Boolean);
  const discount = dealer?.discount_rate || 0;
  const ss = STOCK_STATUS[p.stock_status] || { label: p.stock_status, color: 'slate' };

  const checkManufacturing = () => {
    const stdWidths = ['600', '700', '800', '900'];
    const stdHeights = ['2000', '2100'];
    const isStd = stdWidths.includes(width) && stdHeights.includes(height);
    const base = Number(p.base_price || 0);
    const customUp = (!isStd ? base * 0.25 : 0) + (glass && !p.glass ? base * 0.15 : 0);
    const unit = (base + customUp) * (1 - discount);
    const days = !isStd ? Math.max(p.production_days, 21) + 7 : p.production_days;
    setCheck({
      ok: p.stock_status !== 'discontinued',
      price: Math.round(unit),
      days,
      note: !isStd ? 'Нестандартный размер — требуется согласование с фабрикой. Создайте обращение для подтверждения.' : (p.stock_status === 'on_order' ? 'Производится под заказ.' : 'В наличии на складе.'),
    });
  };

  const addToOrder = () => {
    if (!isDealer(profile)) { nav('/login'); return; }
    nav('/orders/new', { state: { product: { id: p.id, name: p.name, model_code: p.model_code, width, height, color, glass, unit_price: check?.price || Number(p.base_price) * (1 - discount), quantity: qty } } });
  };

  const specs = p.specs || {};

  return (
    <div>
      <button onClick={() => nav(-1)} className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700 mb-4"><ArrowLeft size={16} /> Назад</button>
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Visual */}
        <Card className="overflow-hidden">
          <div className="aspect-[4/3] bg-gradient-to-br from-stone-100 to-stone-200 flex items-center justify-center">
            {p.image_url ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" /> : <div className="text-stone-300"><Ruler size={64} /></div>}
          </div>
          <div className="p-4 flex flex-wrap gap-2">
            <Badge label={ss.label} color={ss.color} />
            <Badge label={`${p.production_days} дн. производство`} color="blue" />
            {p.glass && <Badge label="Остекление" color="indigo" />}
          </div>
        </Card>

        {/* Info + configurator */}
        <div>
          <p className="text-sm text-amber-600 font-medium">{p.collection_name}</p>
          <h1 className="text-2xl font-bold text-stone-800 mt-1">{p.name}</h1>
          <p className="text-stone-500">{p.model_code} · {p.material} · {p.finish}</p>
          <p className="text-3xl font-bold text-stone-800 mt-3">{money(p.base_price)}<span className="text-sm font-normal text-stone-400 ml-1">базовая</span></p>
          {discount > 0 && <p className="text-sm text-emerald-600 mt-1">Дилерская цена: {money(p.base_price * (1 - discount))} (скидка {Math.round(discount * 100)}%)</p>}

          {Object.keys(specs).length > 0 && (
            <Card className="p-4 mt-5">
              <p className="text-sm font-semibold text-stone-700 mb-2">Технические характеристики</p>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                {Object.entries(specs).map(([k, v]) => (
                  <div key={k}><dt className="text-stone-400 text-xs">{k}</dt><dd className="text-stone-700">{String(v)}</dd></div>
                ))}
              </dl>
            </Card>
          )}

          <Card className="p-5 mt-5 border-amber-200 bg-amber-50/40">
            <p className="font-semibold text-stone-800 flex items-center gap-2"><Ruler size={18} className="text-amber-600" /> Проверка возможности изготовления</p>
            <p className="text-xs text-stone-500 mt-1">Подберите комплектацию и проверьте доступность и стоимость.</p>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <Field label="Ширина, мм"><Select value={width} onChange={e => setWidth(e.target.value)}>{widths.map(w => <option key={w}>{w}</option>)}{!widths.includes(width) && <option value={width}>{width}</option>}</Select></Field>
              <Field label="Высота, мм"><Select value={height} onChange={e => setHeight(e.target.value)}>{heights.map(h => <option key={h}>{h}</option>)}{!heights.includes(height) && <option value={height}>{height}</option>}</Select></Field>
              <Field label="Цвет"><Select value={color} onChange={e => setColor(e.target.value)}>{colors.map(c => <option key={c}>{c}</option>)}</Select></Field>
              <Field label="Остекление"><Select value={glass ? '1' : '0'} onChange={e => setGlass(e.target.value === '1')}><option value="0">Без стекла</option><option value="1">С остеклением</option></Select></Field>
              <Field label="Количество"><Select value={qty} onChange={e => setQty(Number(e.target.value))}>{[1,2,3,4,5,6,8,10].map(n => <option key={n} value={n}>{n} шт</option>)}</Select></Field>
            </div>
            <Button className="w-full mt-4" onClick={checkManufacturing} disabled={p.stock_status === 'discontinued'}><CheckCircle2 size={16} /> Проверить</Button>

            {check && (
              <div className="mt-4 rounded-xl bg-white border border-stone-200 p-4">
                <div className="flex items-start gap-3">
                  {check.ok ? <CheckCircle2 className="text-emerald-600 mt-0.5" size={20} /> : <AlertTriangle className="text-rose-600 mt-0.5" size={20} />}
                  <div className="flex-1">
                    <p className="font-semibold text-stone-800">{check.ok ? 'Изготовление возможно' : 'Изготовление невозможно'}</p>
                    <p className="text-sm text-stone-600 mt-1">{check.note}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm">
                      <span className="text-stone-500">Цена за ед.: <b className="text-stone-800">{money(check.price)}</b></span>
                      <span className="text-stone-500">Срок: <b className="text-stone-800">{check.days} дн.</b></span>
                    </div>
                  </div>
                </div>
                {check.ok && isDealer(profile) && (
                  <Button className="w-full mt-3" onClick={addToOrder}><ShoppingCart size={16} /> Добавить в заказ ({money(check.price * qty)})</Button>
                )}
                {check.note?.includes('нестандарт') && isDealer(profile) && (
                  <Link to="/tickets" className="block mt-3"><Button variant="outline" className="w-full"><Sparkles size={16} /> Запросить согласование нестандарта</Button></Link>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
