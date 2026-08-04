import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Card, PageHeader, Button, ProgressBar, Spinner, EmptyState, Badge } from '../components/ui';
import { dateShort } from '../lib/format';
import { GraduationCap, Check, Clock, BookOpen } from 'lucide-react';
import type { Row } from '../lib/types';

export default function Training() {
  const { profile } = useAuth();
  const [modules, setModules] = useState<Row[]>([]);
  const [progress, setProgress] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<number | null>(null);
  const [busy, setBusy] = useState<number | null>(null);

  const load = async () => {
    try {
      const data = await api.get<{ modules: Row[]; progress: Row[] }>('/api/training');
      setModules(data.modules || []); setProgress(data.progress || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const progFor = (mid: number) => progress.find(p => p.module_id === mid);
  const completedCount = progress.filter(p => p.status === 'completed').length;
  const overallPct = modules.length ? Math.round((completedCount / modules.length) * 100) : 0;

  const markComplete = async (mid: number) => {
    setBusy(mid);
    try { await api.post('/api/training', { module_id: mid, status: 'completed', score: 100 }); await load(); }
    catch (e: any) { alert(e.message); }
    finally { setBusy(null); }
  };

  if (loading) return <div className="flex justify-center py-24"><Spinner /></div>;

  return (
    <div>
      <PageHeader title="Обучение" subtitle="Материалы для новых менеджеров дилеров: продукты, процессы, регламенты" />

      {modules.length > 0 && (
        <Card className="p-5 mb-6">
          <div className="flex items-center justify-between mb-2">
            <p className="font-semibold text-stone-800">Общий прогресс</p>
            <p className="text-sm text-stone-500">{completedCount} из {modules.length} модулей</p>
          </div>
          <ProgressBar value={overallPct} />
          <p className="text-sm text-stone-400 mt-2">Пройдено {overallPct}%</p>
        </Card>
      )}

      {modules.length === 0 ? <EmptyState icon={<GraduationCap size={36} />} title="Модули обучения скоро появятся" /> :
       <div className="space-y-4">
         {modules.map(m => {
           const pr = progFor(m.id);
           const done = pr?.status === 'completed';
           return (
             <Card key={m.id} className="overflow-hidden">
               <button onClick={() => setOpen(open === m.id ? null : m.id)} className="w-full text-left p-5 flex items-center gap-4">
                 <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${done ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                   {done ? <Check size={20} /> : <BookOpen size={20} />}
                 </div>
                 <div className="flex-1 min-w-0">
                   <p className="font-semibold text-stone-800">{m.title}</p>
                   <p className="text-sm text-stone-500 mt-0.5">{m.category} · {m.duration_min} мин</p>
                 </div>
                 {done ? <Badge label="Завершено" color="green" /> : pr?.status === 'in_progress' ? <Badge label="В процессе" color="amber" /> : <Badge label="Не начато" color="slate" />}
               </button>
               {open === m.id && (
                 <div className="px-5 pb-5 border-t border-stone-100 pt-4">
                   {m.description && <p className="text-sm text-stone-600 mb-3">{m.description}</p>}
                   <p className="text-sm text-stone-700 whitespace-pre-line leading-relaxed">{m.content}</p>
                   <div className="flex items-center gap-3 mt-4">
                     {!done && <Button onClick={() => markComplete(m.id)} disabled={busy === m.id}><Check size={16} /> {busy === m.id ? 'Сохранение…' : 'Отметить пройденным'}</Button>}
                     {done && <span className="text-sm text-emerald-600 flex items-center gap-1"><Clock size={14} /> Пройдено {dateShort(pr?.completed_at)}</span>}
                   </div>
                 </div>
               )}
             </Card>
           );
         })}
       </div>}
    </div>
  );
}
