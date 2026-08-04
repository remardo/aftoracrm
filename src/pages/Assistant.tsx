import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Card, Button, Spinner, Badge } from '../components/ui';
import { Sparkles, Send, Bot, User as UserIcon, FileText, Package, ShoppingCart, LifeBuoy, AlertTriangle, ArrowRight } from 'lucide-react';
import { money } from '../lib/format';
import type { Row } from '../lib/types';

interface Msg { role: 'user' | 'assistant'; content: string; articles?: Row[]; products?: Row[]; actions?: { label: string; to: string }[]; canAutoResolve?: boolean; suggestedTicket?: any; }

const SUGGESTIONS = [
  'Подбери недорогую дверь для спальни',
  'Какой статус у моих заказов?',
  'Хочу оформить рекламацию по браку',
  'Какие условия доставки и оплаты?',
  'Подбери дверь со стеклом в стиле лофт',
  'Какие размеры дверей доступны?',
];

export default function Assistant() {
  const { profile } = useAuth();
  const nav = useNavigate();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [convId, setConvId] = useState<number | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Msg = { role: 'user', content: text };
    setMessages(m => [...m, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      const res = await api.post<Row>('/api/ai-assistant', { message: text, history, conversation_id: convId });
      setConvId(res.conversation_id);
      setMessages(m => [...m, {
        role: 'assistant', content: res.reply,
        articles: res.articles, products: res.products, actions: res.actions,
        canAutoResolve: res.canAutoResolve, suggestedTicket: res.suggestedTicket,
      }]);
    } catch (e: any) {
      setMessages(m => [...m, { role: 'assistant', content: 'Произошла ошибка: ' + e.message }]);
    } finally { setLoading(false); }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white mb-3"><Sparkles size={28} /></div>
        <h1 className="text-2xl font-bold text-stone-800">ИИ-ассистент «Афтора»</h1>
        <p className="text-stone-500 text-sm mt-1 max-w-lg mx-auto">Помогает подобрать дверь, узнать статус заказа, найти ответ в базе знаний. Если вопрос нестандартный — соберёт контекст и создаст обращение для менеджера фабрики.</p>
      </div>

      <Card className="flex flex-col h-[60vh] min-h-[420px]">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <p className="text-stone-500 mb-4">С чего начнём? Вот частые запросы:</p>
              <div className="grid sm:grid-cols-2 gap-2 w-full max-w-lg">
                {SUGGESTIONS.map(s => (
                  <button key={s} onClick={() => send(s)} className="text-left text-sm rounded-xl border border-stone-200 px-3.5 py-2.5 hover:border-amber-400 hover:bg-amber-50 text-stone-700">{s}</button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${m.role === 'user' ? 'bg-stone-200 text-stone-600' : 'bg-gradient-to-br from-amber-400 to-orange-500 text-white'}`}>
                {m.role === 'user' ? <UserIcon size={16} /> : <Bot size={16} />}
              </div>
              <div className={`max-w-[85%] ${m.role === 'user' ? 'text-right' : ''}`}>
                <div className={`rounded-2xl px-4 py-2.5 text-sm whitespace-pre-line ${m.role === 'user' ? 'bg-amber-600 text-white' : 'bg-stone-100 text-stone-800'}`}>{m.content}</div>

                {m.articles && m.articles.length > 0 && (
                  <div className="mt-2 space-y-1.5 text-left">
                    {m.articles.map(a => (
                      <button key={a.id} onClick={() => nav('/knowledge')} className="block w-full text-left rounded-lg bg-white border border-stone-200 px-3 py-2 hover:border-amber-300">
                        <p className="text-sm font-medium text-stone-800 flex items-center gap-1.5"><FileText size={13} className="text-amber-600" /> {a.title}</p>
                        <p className="text-xs text-stone-500 line-clamp-2 mt-0.5">{a.snippet}</p>
                      </button>
                    ))}
                  </div>
                )}

                {m.products && m.products.length > 0 && (
                  <div className="mt-2 grid sm:grid-cols-2 gap-2 text-left">
                    {m.products.map(pr => (
                      <button key={pr.id} onClick={() => nav(`/catalog/${pr.id}`)} className="text-left rounded-lg bg-white border border-stone-200 px-3 py-2 hover:border-amber-300">
                        <p className="text-sm font-medium text-stone-800">{pr.name}</p>
                        <p className="text-xs text-stone-500">{pr.collection_name} · {money(pr.base_price)}</p>
                      </button>
                    ))}
                  </div>
                )}

                {m.actions && m.actions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2 justify-end text-left">
                    {m.actions.map((a, j) => (
                      <Button key={j} size="sm" variant="outline" onClick={() => nav(a.to)}>{a.label} <ArrowRight size={13} /></Button>
                    ))}
                  </div>
                )}

                {m.suggestedTicket && (
                  <div className="mt-2 rounded-xl bg-amber-50 border border-amber-200 p-3 text-left">
                    <p className="text-sm text-stone-700 mb-2">Не удалось решить автоматически — создам обращение с контекстом диалога для менеджера фабрики.</p>
                    <Button size="sm" onClick={() => nav('/tickets', { state: { prefill: m.suggestedTicket } })}><LifeBuoy size={14} /> Создать обращение</Button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && <div className="flex justify-center"><Spinner className="w-5 h-5" /></div>}
          <div ref={endRef} />
        </div>

        <div className="border-t border-stone-100 p-3 flex gap-2">
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') send(input); }} placeholder="Опишите вопрос…" className="flex-1 rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-100 outline-none" />
          <Button onClick={() => send(input)} disabled={loading}><Send size={16} /></Button>
        </div>
      </Card>
      <p className="text-center text-xs text-stone-400 mt-3">ИИ-ассистент — помощник, а не замена сотрудника. Сложные вопросы эскалируются менеджерам фабрики.</p>
    </div>
  );
}
