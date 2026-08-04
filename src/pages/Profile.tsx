import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { ROLES, ROLE_COLOR } from '../lib/constants';
import { Card, PageHeader, Button, Field, Input, Badge } from '../components/ui';
import { Save, CheckCircle2 } from 'lucide-react';
import type { Role, Profile } from '../lib/types';

export default function ProfilePage() {
  const { profile, refresh } = useAuth();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [saved, setSaved] = useState(false);
  const [dealer, setDealer] = useState<any>(null);

  useEffect(() => {
    if (profile) { setFullName(profile.full_name); setPhone(profile.phone || ''); }
  }, [profile]);

  useEffect(() => {
    if (profile?.dealer_id) api.get('/api/dealers').then((d: any[]) => setDealer(d.find(x => x.id === profile.dealer_id))).catch(() => {});
  }, [profile?.dealer_id]);

  const save = async () => {
    await api.put('/api/auth', { full_name: fullName, phone });
    await refresh();
    setSaved(true); setTimeout(() => setSaved(false), 2500);
  };

  if (!profile) return null;

  return (
    <div className="max-w-3xl">
      <PageHeader title="Профиль" subtitle="Личные данные и информация о компании" />
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="p-5 md:col-span-1 h-fit">
          <div className="flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-full bg-amber-100 text-amber-800 text-2xl font-bold flex items-center justify-center">
              {(profile.full_name || '?').trim().split(/\s+/).map(s => s[0]).slice(0,2).join('')}
            </div>
            <p className="font-semibold text-stone-800 mt-3">{profile.full_name}</p>
            <p className="text-sm text-stone-500">{profile.email}</p>
            <span className={`mt-2 text-xs px-2.5 py-0.5 rounded-full ${ROLE_COLOR[profile.role as Role]}`}>{ROLES[profile.role as Role]}</span>
            <span className="mt-2 text-xs px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-600">{profile.status === 'active' ? 'Активен' : profile.status === 'pending' ? 'Ожидает активации' : profile.status}</span>
          </div>
        </Card>

        <Card className="p-5 md:col-span-2">
          <h3 className="font-semibold text-stone-800 mb-4">Личные данные</h3>
          <div className="space-y-4">
            <Field label="ФИО"><Input value={fullName} onChange={e => setFullName(e.target.value)} /></Field>
            <Field label="Телефон"><Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+7 …" /></Field>
            <Field label="Email"><Input value={profile.email} disabled className="opacity-60" /></Field>
            <div className="flex items-center gap-3 pt-1">
              <Button onClick={save}><Save size={16} /> Сохранить</Button>
              {saved && <span className="text-sm text-emerald-600 flex items-center gap-1"><CheckCircle2 size={16} /> Сохранено</span>}
            </div>
          </div>
        </Card>
      </div>

      {dealer && (
        <Card className="p-5 mt-6">
          <h3 className="font-semibold text-stone-800 mb-4">Моя компания</h3>
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <Info label="Дилер" value={dealer.name} />
            <Info label="Юр. лицо" value={dealer.legal_name} />
            <Info label="ИНН" value={dealer.inn} />
            <Info label="Город" value={dealer.city} />
            <Info label="Регион" value={dealer.region} />
            <Info label="Скидка" value={`${Math.round((dealer.discount_rate || 0) * 100)}%`} />
            <Info label="Контактный email" value={dealer.contact_email} />
            <Info label="Контактный телефон" value={dealer.contact_phone} />
          </div>
        </Card>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs text-stone-400">{label}</p>
      <p className="text-stone-800 font-medium mt-0.5">{value || '—'}</p>
    </div>
  );
}
