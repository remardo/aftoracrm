import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { Card, PageHeader, Input, Select, Spinner, EmptyState, Badge } from '../components/ui';
import { STOCK_STATUS } from '../lib/constants';
import { money } from '../lib/format';
import { Package, Search } from 'lucide-react';
import type { Row } from '../lib/types';

export default function Catalog() {
  const [products, setProducts] = useState<Row[]>([]);
  const [collections, setCollections] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [col, setCol] = useState('');
  const [stock, setStock] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (col) params.set('collection_id', col);
      if (stock) params.set('stock_status', stock);
      const [p, c] = await Promise.all([api.get(`/api/products?${params}`), api.get('/api/collections')]);
      setProducts(p || []); setCollections(c || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, col, stock]);

  return (
    <div>
      <PageHeader title="Каталог продукции" subtitle="Межкомнатные двери: характеристики, комплектация, наличие и сроки производства" />

      <Card className="p-4 mb-6">
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="relative sm:col-span-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <Input className="pl-9" placeholder="Поиск по названию, коду, материалу" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={col} onChange={e => setCol(e.target.value)}>
            <option value="">Все коллекции</option>
            {collections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Select value={stock} onChange={e => setStock(e.target.value)}>
            <option value="">Любой статус</option>
            <option value="in_stock">В наличии</option>
            <option value="on_order">Под заказ</option>
            <option value="discontinued">Снят с производства</option>
          </Select>
        </div>
      </Card>

      {loading ? <div className="flex justify-center py-20"><Spinner /></div> :
       products.length === 0 ? <EmptyState icon={<Package size={36} />} title="Ничего не найдено" hint="Измените параметры поиска" /> :
       <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
         {products.map(p => {
           const ss = STOCK_STATUS[p.stock_status] || { label: p.stock_status, color: 'slate' };
           return (
             <Link key={p.id} to={`/catalog/${p.id}`}>
               <Card className="overflow-hidden hover:shadow-md hover:border-amber-300 transition h-full flex flex-col">
                 <div className="aspect-[4/3] bg-gradient-to-br from-stone-100 to-stone-200 flex items-center justify-center relative">
                   {p.image_url ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" /> :
                     <div className="text-stone-300"><Package size={48} /></div>}
                   <div className="absolute top-3 right-3"><Badge label={ss.label} color={ss.color} /></div>
                 </div>
                 <div className="p-4 flex-1 flex flex-col">
                   <p className="text-xs text-amber-600 font-medium">{p.collection_name || '—'}</p>
                   <p className="font-semibold text-stone-800 mt-0.5">{p.name}</p>
                   <p className="text-xs text-stone-400 mt-0.5">{p.model_code} · {p.material}</p>
                   <div className="mt-auto pt-3 flex items-end justify-between">
                     <div>
                       <p className="text-xs text-stone-400">от</p>
                       <p className="font-bold text-stone-800">{money(p.base_price)}</p>
                     </div>
                     <span className="text-xs text-stone-500">{p.production_days} дн.</span>
                   </div>
                 </div>
               </Card>
             </Link>
           );
         })}
       </div>}
    </div>
  );
}
