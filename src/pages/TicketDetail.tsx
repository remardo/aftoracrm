import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Card, Button, Badge, Spinner, EmptyState, Field, Select, Textarea } from '../components/ui';
import { TICKET_STATUS, TICKET_CATEGORY, TICKET_PRIORITY, isFactory } from '../lib/constants';
import { dateTime } from '../lib/format';
import { ArrowLeft, Send, Bot, User as UserIcon, AlertTriangle, Sparkles, Check } from 'lucide-react';
import type { Row } from '../lib/types';

export default function TicketDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { profile } = useAuth();
  const [ticket, setTicket] = useState<Row | null>(null);
  const [messages, setMessages] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [ctrl, setCtrl] = useState({ status: '', priority: '', resolution: '', assigned_to: '' });
  const [savingCtrl, setSavingCtrl] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    try {
      const all = await api.get<Row[]>('/api/tickets');
      const t = all.find(x => String(x.id) === String(id));
      setTicket(t || null);
      if (t) setCtrl({ status: t.status, priority: t.priority, resolution: t.resolution || '', assigned_to: t.assigned_to || '' });
      const msgs = await api.get<Row[]>(`/api/ticket-messages?ticket_id=${id}`);
      setMessages(msgs || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [id]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);

  if (loading) return <div className="flex justify-center py-24"><Spinner /></div>;
  if (!ticket) return <EmptyState icon={<AlertTriangle size={36} />} title="Обращение не найдено" action={<Link to="/tickets"><Button><ArrowLeft size={16} /> К обращениям</Button></Link>} />;

  const st = TICKET_STATUS[ticket.status] || { label: ticket.status, color: 'slate' };
  const pr = TICKET_PRIORITY[ticket.priority] || { label: ticket.priority, color: 'slate' };
  const canManage = isFactory(profile);

  const sendReply = async () => {
    if (!reply.trim()) return;
    setSending(true);
    try { await api.post('/api/ticket-messages', { ticket_id: ticket.id, message: reply }); setReply(''); await load(); }
    catch (e: any) { alert(e.message); }
    finally { setSending(false); }
  };

  const saveCtrl = async () => {
    setSavingCtrl(true);
    try { await api.put('/api/tickets', { id: ticket.id, ...ctrl }); await load(); }
    catch (e: any) { alert(e.message); }
    finally { setSavingCtrl(false); }
  };

  const assignMe = async () => {
    const myEmail = profile?.email || '';
    setCtrl(c => ({ ...c, assigned_to: myEmail, status: c.status && c.status !== 'open' ? c.status : 'in_progress' }));
    await api.put('/api/tickets', { id: ticket.id, assigned_to: myEmail, status: ctrl.status && ctrl.status !== 'open' ? ctrl.status : 'in_progress' });
    await load();
  };

  return (
    <div>
      <button onClick={() => nav('/tickets')} className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700 mb-4"><ArrowLeft size={16} /> К обращениям</button>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm text-stone-400">{ticket.ticket_number}</span>
            <Badge label={st.label} color={st.color} />
            <Badge label={pr.label} color={pr.color} />
            <Badge label={TICKET_CATEGORY[ticket.category] || ticket.category} color="slate" />
            {ticket.ai_resolved && <Badge label="ИИ решено" color="purple" />}
          </div>
          <h1 className="text-xl font-bold text-stone-800 mt-2">{ticket.subject}</h1>
          <p className="text-stone-500 text-sm mt-1">{isFactory(profile) && (ticket.dealer_name + ' · ')}{ticket.created_by_name} · {dateTime(ticket.created_at)}{ticket.assigned_to && ` · отв.: ${ticket.assigned_to}`}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Conversation */}
        <div className="lg:col-span-2">
          {ticket.ai_response && (
            <Card className="p-4 mb-4 border-amber-200 bg-amber-50/40">
              <div className="flex items-start gap-2.5">
                <Bot size={18} className="text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-stone-800">Ответ ИИ-агента</p>
                  <p className="text-sm text-stone-600 whitespace-pre-line mt-1">{ticket.ai_response}</p>
                </div>
              </div>
            </Card>
          )}

          <Card className="flex flex-col h-[50vh] min-h-[360px]">
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map(m => {
                const isMe = m.author_email === profile?.email;
                const isAI = m.author_role === 'ai';
                return (
                  <div key={m.id} className={`flex gap-2.5 ${isMe ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isAI ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white' : isMe ? 'bg-stone-200 text-stone-600' : 'bg-sky-100 text-sky-700'}`}>{isAI ? <Bot size={15} /> : <UserIcon size={15} />}</div>
                    <div className={`max-w-[80%] ${isMe ? 'text-right' : ''}`}>
                      <p className="text-xs text-stone-400 mb-0.5">{m.author_name}{isAI ? ' · ИИ' : m.author_role === 'factory' ? ' · фабрика' : ''} · {dateTime(m.created_at)}</p>
                      <div className={`rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-line ${isMe ? 'bg-amber-600 text-white' : isAI ? 'bg-amber-50 text-stone-700 border border-amber-100' : 'bg-stone-100 text-stone-800'}`}>{m.message}</div>
                    </div>
                  </div>
                );
              })}
              {ticket.resolution && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-800"><b>Решение:</b> {ticket.resolution}</div>
              )}
              <div ref={endRef} />
            </div>
            <div className="border-t border-stone-100 p-3 flex gap-2">
              <textarea value={reply} onChange={e => setReply(e.target.value)} placeholder="Ваш ответ…" rows={1} className="flex-1 rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-100 outline-none resize-none" />
              <Button onClick={sendReply} disabled={sending || !reply.trim()}><Send size={16} /></Button>
            </div>
          </Card>
        </div>

        {/* Controls */}
        <div className="space-y-6">
          <Card className="p-5">
            <h3 className="font-semibold text-stone-800 mb-3">Информация</h3>
            <dl className="text-sm space-y-2">
              <R k="Дилер" v={ticket.dealer_name} />
              <R k="Автор" v={ticket.created_by_name} />
              <R k="Создано" v={dateTime(ticket.created_at)} />
              <R k="Обновлено" v={dateTime(ticket.updated_at)} />
              <R k="Решено" v={ticket.resolved_at ? dateTime(ticket.resolved_at) : '—'} />
              <R k="Ответственный" v={ticket.assigned_to || 'не назначен'} />
            </dl>
            <p className="text-sm text-stone-600 mt-4 whitespace-pre-line bg-stone-50 rounded-xl p-3">{ticket.description}</p>
          </Card>

          {canManage && (
            <Card className="p-5 border-amber-200">
              <h3 className="font-semibold text-stone-800 mb-3">Управление</h3>
              <div className="space-y-3">
                <Field label="Статус"><Select value={ctrl.status} onChange={e => setCtrl({ ...ctrl, status: e.target.value })}>{Object.entries(TICKET_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</Select></Field>
                <Field label="Приоритет"><Select value={ctrl.priority} onChange={e => setCtrl({ ...ctrl, priority: e.target.value })}>{Object.entries(TICKET_PRIORITY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</Select></Field>
                <Field label="Ответственный (email)"><input value={ctrl.assigned_to} onChange={e => setCtrl({ ...ctrl, assigned_to: e.target.value })} className="w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-100 outline-none" /></Field>
                <Button size="sm" variant="outline" className="w-full" onClick={assignMe}><Check size={14} /> Назначить на меня</Button>
                <Field label="Решение"><Textarea rows={3} value={ctrl.resolution} onChange={e => setCtrl({ ...ctrl, resolution: e.target.value })} /></Field>
                <Button className="w-full" onClick={saveCtrl} disabled={savingCtrl}>Сохранить</Button>
              </div>
            </Card>
          )}
          {!canManage && ticket.status !== 'resolved' && ticket.status !== 'closed' && (
            <Card className="p-4 bg-sky-50 border-sky-200"><p className="text-sm text-sky-800 flex items-center gap-2"><Sparkles size={16} /> Ваше обращение в работе. Менеджер фабрики ответит в этой переписке.</p></Card>
          )}
        </div>
      </div>
    </div>
  );
}

function R({ k, v }: { k: string; v?: string | null }) {
  return <div className="flex justify-between gap-3"><dt className="text-stone-400 shrink-0">{k}</dt><dd className="text-stone-700 text-right">{v || '—'}</dd></div>;
}
