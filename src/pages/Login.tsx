import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button, Input, Field } from '../components/ui';
import { AlertCircle, Sparkles, Building2 } from 'lucide-react';

const DEMO = [
  { email: 'admin@aftora.ru', role: 'Руководство фабрики' },
  { email: 'manager@aftora.ru', role: 'Менеджер фабрики' },
  { email: 'dealer@aftora.ru', role: 'Администратор дилера' },
  { email: 'dm@aftora.ru', role: 'Менеджер дилера' },
];

export default function Login() {
  const { signIn, signUp, google } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      if (mode === 'login') await signIn(email, password);
      else await signUp(email, password);
      nav('/');
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const quick = (em: string) => { setEmail(em); setPassword('password123'); };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-stone-100">
      {/* Brand panel */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 text-white overflow-hidden bg-slate-900">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'url(/uploads/doors.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }} />
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center font-extrabold text-slate-900 text-2xl">А</div>
            <div>
              <p className="text-2xl font-bold">Афтора</p>
              <p className="text-sm text-slate-300">Фабрика межкомнатных дверей</p>
            </div>
          </div>
        </div>
        <div className="relative space-y-6">
          <h1 className="text-4xl font-bold leading-tight">Единое рабочее пространство фабрики и дилеров</h1>
          <p className="text-slate-300 text-lg max-w-md">Каталог, заказы, отслеживание производства, база знаний и ИИ-ассистент — всё в одном B2B-портале.</p>
          <div className="grid grid-cols-2 gap-3 max-w-md">
            {[['Самообслуживание', 'дилеров'], ['ИИ-агент', 'для типовых запросов'], ['Единая база', 'знаний'], ['Отслеживание', 'производства']].map(([a, b]) => (
              <div key={a} className="rounded-xl bg-white/10 backdrop-blur p-3 border border-white/10">
                <p className="font-semibold text-sm">{a}</p>
                <p className="text-xs text-slate-300">{b}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="relative text-xs text-slate-400">© 2024 Фабрика «Афтора». B2B-портал.</p>
      </div>

      {/* Form */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-11 h-11 rounded-xl bg-amber-500 flex items-center justify-center font-extrabold text-slate-900 text-xl">А</div>
            <p className="text-xl font-bold text-stone-800">Афтора · B2B</p>
          </div>
          <h2 className="text-2xl font-bold text-stone-800">{mode === 'login' ? 'Вход в портал' : 'Регистрация дилера'}</h2>
          <p className="text-stone-500 mt-1 text-sm">{mode === 'login' ? 'Войдите в учётную запись компании.' : 'Создайте учётную запись дилера (активируется фабрикой).'}</p>

          {error && <div className="mt-4 flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-sm text-rose-700"><AlertCircle size={16} /> {error}</div>}

          <form onSubmit={submit} className="mt-5 space-y-4">
            <Field label="Email" required>
              <Input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.ru" />
            </Field>
            <Field label="Пароль" required>
              <Input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••" />
            </Field>
            <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Подождите…' : (mode === 'login' ? 'Войти' : 'Зарегистрироваться')}</Button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="h-px bg-stone-200 flex-1" /><span className="text-xs text-stone-400">или</span><div className="h-px bg-stone-200 flex-1" />
          </div>
          <Button variant="outline" className="w-full" onClick={google}><Building2 size={18} /> Войти через Google</Button>

          <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }} className="block w-full text-center text-sm text-stone-500 hover:text-stone-700 mt-5">
            {mode === 'login' ? 'Нет учётной записи? Зарегистрироваться' : 'Уже есть аккаунт? Войти'}
          </button>

          <div className="mt-6 rounded-xl border border-dashed border-stone-300 p-4 bg-stone-50">
            <p className="text-xs font-medium text-stone-500 flex items-center gap-1.5"><Sparkles size={14} className="text-amber-500" /> Демо-доступ (пароль: password123)</p>
            <div className="grid grid-cols-2 gap-1.5 mt-2.5">
              {DEMO.map(d => (
                <button key={d.email} type="button" onClick={() => quick(d.email)} className="text-left rounded-lg bg-white border border-stone-200 px-2.5 py-1.5 hover:border-amber-400 hover:bg-amber-50">
                  <p className="text-[11px] font-medium text-stone-700 truncate">{d.email}</p>
                  <p className="text-[10px] text-stone-400">{d.role}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
