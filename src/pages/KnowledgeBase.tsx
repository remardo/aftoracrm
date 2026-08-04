import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Card, PageHeader, Button, Input, Textarea, Field, Select, Spinner, EmptyState, Badge, Modal } from '../components/ui';
import { KNOWLEDGE_CATEGORY, isFactory } from '../lib/constants';
import { BookOpen, Search, Plus, ThumbsUp, ThumbsDown, Eye, FileText } from 'lucide-react';
import type { Row } from '../lib/types';

const CATS = Object.entries(KNOWLEDGE_CATEGORY);

export default function KnowledgeBase() {
  const { profile } = useAuth();
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [cat, setCat] = useState('');
  const [search, setSearch] = useState('');
  const [active, setActive] = useState<Row | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: '', category: 'product', content: '', tags: '' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (cat) params.set('category', cat);
      if (search) params.set('search', search);
      setItems(await api.get(`/api/knowledge?${params}`));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cat, search]);

  const vote = async (id: number, helpful: boolean) => {
    await api.put('/api/knowledge', { id, helpful_vote: helpful });
    setActive(prev => prev ? { ...prev, [helpful ? 'helpful' : 'not_helpful']: (prev[helpful ? 'helpful' : 'not_helpful'] || 0) + 1 } : prev);
    load();
  };

  const save = async () => {
    if (!form.title || !form.content) return;
    setSaving(true);
    try {
      await api.post('/api/knowledge', form);
      setCreating(false); setForm({ title: '', category: 'product', content: '', tags: '' });
      load();
    } catch (e: any) { alert(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <PageHeader title="База знаний" subtitle="Единый источник правды: регламенты, инструкции, ответы на частые вопросы"
        actions={isFactory(profile) ? <Button onClick={() => setCreating(true)}><Plus size={16} /> Добавить статью</Button> : undefined} />

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <Input className="pl-9" placeholder="Поиск по статьям" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={cat} onChange={e => setCat(e.target.value)} className="sm:w-56">
          <option value="">Все категории</option>
          {CATS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        <button onClick={() => setCat('')} className={`px-3 py-1.5 rounded-full text-sm ${cat === '' ? 'bg-amber-600 text-white' : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'}`}>Все</button>
        {CATS.map(([k, v]) => (
          <button key={k} onClick={() => setCat(k)} className={`px-3 py-1.5 rounded-full text-sm ${cat === k ? 'bg-amber-600 text-white' : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'}`}>{v}</button>
        ))}
      </div>

      {loading ? <div className="flex justify-center py-20"><Spinner /></div> :
       items.length === 0 ? <EmptyState icon={<BookOpen size={36} />} title="Статей не найдено" /> :
       <div className="grid md:grid-cols-2 gap-4">
         {items.map(a => (
           <Card key={a.id} className="p-5 hover:shadow-md hover:border-amber-300 transition cursor-pointer" onClick={() => setActive(a)}>
             <div className="flex items-center gap-2 mb-2">
               <Badge label={KNOWLEDGE_CATEGORY[a.category] || a.category} color="amber" />
               {a.tags && <span className="text-xs text-stone-400">{a.tags}</span>}
             </div>
             <p className="font-semibold text-stone-800">{a.title}</p>
            <p className="text-sm text-stone-500 mt-1.5 line-clamp-3">{a.content}</p>
             <div className="flex items-center gap-4 mt-3 text-xs text-stone-400">
               <span className="flex items-center gap-1"><Eye size={13} /> {a.views || 0}</span>
               <span className="flex items-center gap-1 text-emerald-600"><ThumbsUp size={13} /> {a.helpful || 0}</span>
               <span className="flex items-center gap-1"><ThumbsDown size={13} /> {a.not_helpful || 0}</span>
             </div>
           </Card>
         ))}
       </div>}

      {/* Article modal */}
      <Modal open={!!active} onClose={() => setActive(null)} title={active?.title || ''} size="lg">
        {active && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Badge label={KNOWLEDGE_CATEGORY[active.category] || active.category} color="amber" />
              <span className="text-xs text-stone-400">Автор: {active.author_name}</span>
            </div>
            <p className="text-stone-700 whitespace-pre-line leading-relaxed">{active.content}</p>
            <div className="flex items-center gap-3 mt-5 pt-4 border-t border-stone-100">
              <span className="text-sm text-stone-500">Помогла статья?</span>
              <Button size="sm" variant="subtle" onClick={() => vote(active.id, true)}><ThumbsUp size={14} /> Да</Button>
              <Button size="sm" variant="ghost" onClick={() => vote(active.id, false)}><ThumbsDown size={14} /> Нет</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create modal */}
      <Modal open={creating} onClose={() => setCreating(false)} title="Новая статья базы знаний" size="lg">
        <div className="space-y-4">
          <Field label="Заголовок" required><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></Field>
          <Field label="Категория" required><Select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>{CATS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
          <Field label="Теги (через запятую)" hint="Помогают поиску"><Input value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} /></Field>
          <Field label="Содержание" required><Textarea rows={8} value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} /></Field>
          <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setCreating(false)}>Отмена</Button><Button onClick={save} disabled={saving}><FileText size={16} /> {saving ? 'Сохранение…' : 'Опубликовать'}</Button></div>
        </div>
      </Modal>
    </div>
  );
}
