import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Card, PageHeader, Button, Input, Textarea, Field, Select, Spinner, EmptyState, Badge, Tabs, Modal } from '../components/ui';
import { TICKET_STATUS, TICKET_CATEGORY, TICKET_PRIORITY, isDealer, isFactory } from '../lib/constants';
import { dateShort, dateTime } from '../lib/format';
import { LifeBuoy, Plus, Search, Bot, Sparkles } from 'lucide-react';
import type { Row } from '../lib/types';

const TABS = [
  { key: '', label: 'Все' },
  { key: 'open', label: 'Открытые' },
  { key: 'in_progress', label: 'В работе' },
  { key: 'resolved', label: 'Решённые' },
  { key: 'escalated', label: 'Эскалированные' },
];
const CATS = Object.entries(TICKET_CATEGORY);
const PRIOS = Object.entries(TICKET_PRIORITY);

export default function Tickets() {
  const { profile } = useAuth();
  const loc = useLocation() as any;
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('');
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ subject: '', category: 'other', priority: 'medium', description: '' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (tab) params.set('status', tab);
      setItems(await api.get(`/api/tickets?${params}`));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [tab]);

  // prefill from assistant
  useEffect(() => {
    if (loc.state?.prefill) {
      const p = loc.state.prefill;
      setForm({ subject: p.subject || '', category: p.category || 'other', priority: 'medium', description: p.description || '' });
      setCreating(true);
      window.history.replaceState({}, document.title);
    }
  }, [loc.state]);

  const filtered = items.filter(t => !search || t.subject?.toLowerCase().includes(search.toLowerCase()) || t.ticket_number?.toLowerCase().includes(search.toLowerCase()));

  const save = async () => {
    if (!form.subject || !form.description) return;
    setSaving(true);
    try { await api.post('/api/tickets', form); setCreating(false); setForm({ subject: '', category: 'other', priority: 'medium', description: '' }); load(); }
    catch (e: any) { alert(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <PageHeader title="Обращения" subtitle="Структурированные запросы вместо неструктурированных чатов. ИИ обрабатывает типовые, остальные — менеджерам фабрики."
        actions={isDealer(profile) ? <Button onClick={() => setCreating(true)}><Plus size={16} /> Новое обращение</Button> : undefined} />

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      <div className="flex items-center gap-3 my-4">
        <div className="relative w-full max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <Input className="pl-9" placeholder="Поиск по теме или номеру" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {loading ? <div className="flex justify-center py-16"><Spinner /></div> :
       filtered.length === 0 ? <EmptyState icon={<LifeBuoy size={36} />} title="Обращений нет" hint="Создайте обращение, если ИИ не смог помочь" /> :
       <div className="space-y-3">
         {filtered.map(t => {
           const st = TICKET_STATUS[t.status] || { label: t.status, color: 'slate' };
           const pr = TICKET_PRIORITY[t.priority] || { label: t.priority, color: 'slate' };
           return (
             <Link key={t.id} to={`/tickets/${t.id}`}>
               <Card className="p-4 hover:shadow-md hover:border-amber-300 transition flex items-center gap-4">
                 <div className="flex-1 min-w-0">
                   <div className="flex items-center gap-2 flex-wrap">
                     <span className="font-mono text-xs text-stone-400">{t.ticket_number}</span>
                     {t.ai_resolved && <Badge label="ИИ решено" color="purple" />}
                     <Badge label={TICKET_CATEGORY[t.category] || t.category} color="slate" />
                   </div>
                   <p className="font-medium text-stone-800 mt-1 truncate">{t.subject}</p>
                   <p className="text-xs text-stone-400 mt-0.5">{isFactory(profile) && (t.dealer_name + ' · ')}{t.created_by_name} · {dateShort(t.created_at)}</p>
                 </div>
                 <div className="flex flex-col items-end gap-1.5 shrink-0">
                   <Badge label={pr.label} color={pr.color} />
                   <Badge label={st.label} color={st.color} />
                 </div>
               </Card>
             </Link>
           );
         })}
       </div>}

      <Modal open={creating} onClose={() => setCreating(false)} title="Новое обращение" size="lg">
        <div className="space-y-4">
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-stone-600 flex gap-2"><Sparkles size={16} className="text-amber-600 shrink-0 mt-0.5" /> Совет: сначала спросите ИИ-ассистента — возможно, вопрос решится автоматически. Если нет — создайте обращение, оно попадёт менеджеру фабрики.</div>
          <Field label="Тема" required><Input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} /></Field>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Категория" required><Select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>{CATS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
            <Field label="Приоритет" required><Select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>{PRIOS.map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</Select></Field>
          </div>
          <Field label="Описание" required hint="Опишите вопрос максимально подробно — это ускорит ответ"><Textarea rows={6} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></Field>
          <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setCreating(false)}>Отмена</Button><Button onClick={save} disabled={saving}>{saving ? 'Отправка…' : 'Отправить'}</Button></div>
        </div>
      </Modal>
    </div>
  );
}
