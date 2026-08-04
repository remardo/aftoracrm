import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { LayoutDashboard, Package, BookOpen, Sparkles, ShoppingCart, LifeBuoy, AlertTriangle, GraduationCap, Building2, BarChart3, History, Bell, LogOut, Menu, X, ChevronDown, Settings } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ROLES, ROLE_COLOR, isFactory } from '../lib/constants';
import { api } from '../lib/api';
import { Avatar } from './ui';
import type { Role, NavItem } from '../lib/types';
import { dateTime } from '../lib/format';

const NAV: (NavItem & { icon: any })[] = [
  { to: '/', label: 'Дашборд', icon: LayoutDashboard },
  { to: '/catalog', label: 'Каталог', icon: Package },
  { to: '/knowledge', label: 'База знаний', icon: BookOpen },
  { to: '/assistant', label: 'ИИ-ассистент', icon: Sparkles },
  { to: '/orders', label: 'Заказы', icon: ShoppingCart },
  { to: '/tickets', label: 'Обращения', icon: LifeBuoy },
  { to: '/claims', label: 'Рекламации', icon: AlertTriangle },
  { to: '/training', label: 'Обучение', icon: GraduationCap },
  { to: '/dealers', label: 'Дилеры', icon: Building2, roles: ['factory_admin', 'factory_manager'] },
  { to: '/statistics', label: 'Аналитика', icon: BarChart3, roles: ['factory_admin', 'factory_manager'] },
  { to: '/activity', label: 'Журнал', icon: History, roles: ['factory_admin', 'factory_manager'] },
];

interface Notif { id: number; title: string; message: string; type: string; read: boolean; created_at: string; related_id: number | null; }

export default function Layout() {
  const { profile, signOut } = useAuth();
  const loc = useLocation();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const menuRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLDivElement>(null);

  const fetchNotifs = async () => {
    try { setNotifs(await api.get<Notif[]>('/api/notifications')); } catch {}
  };
  useEffect(() => { fetchNotifs(); const i = setInterval(fetchNotifs, 30000); return () => clearInterval(i); }, []);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => { setOpen(false); }, [loc.pathname]);

  const unread = notifs.filter(n => !n.read).length;
  const items = NAV.filter(n => !n.roles || (profile && n.roles.includes(profile.role)));

  const markAllRead = async () => { await api.put('/api/notifications', { all: true }); fetchNotifs(); };
  const markRead = async (id: number) => { await api.put('/api/notifications', { id }); fetchNotifs(); };

  return (
    <div className="min-h-screen bg-stone-100 flex">
      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-slate-900 text-slate-300 flex flex-col transition-transform ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="h-16 flex items-center gap-2.5 px-5 border-b border-slate-800">
          <div className="w-9 h-9 rounded-lg bg-amber-500 flex items-center justify-center font-bold text-slate-900 text-lg">А</div>
          <div>
            <p className="font-bold text-white leading-tight">Афтора</p>
            <p className="text-[11px] text-slate-400 leading-tight">B2B-портал</p>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {items.map(it => {
            const Icon = it.icon;
            const active = loc.pathname === it.to || (it.to !== '/' && loc.pathname.startsWith(it.to));
            return (
              <Link key={it.to} to={it.to} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium mb-0.5 transition ${active ? 'bg-amber-500 text-slate-900' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
                <Icon size={18} /> {it.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-slate-800">
          <Link to="/profile" className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-slate-800 transition">
            <Avatar name={profile?.full_name || ''} size={32} />
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{profile?.full_name}</p>
              <p className="text-[11px] text-slate-400 truncate">{profile ? ROLES[profile.role as Role] : ''}</p>
            </div>
          </Link>
        </div>
      </aside>

      {open && <div className="fixed inset-0 bg-slate-900/40 z-30 lg:hidden" onClick={() => setOpen(false)} />}

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 bg-white border-b border-stone-200 flex items-center gap-3 px-4 sticky top-0 z-20">
          <button className="lg:hidden text-stone-600" onClick={() => setOpen(true)}><Menu size={22} /></button>
          <div className="flex-1">
            <p className="text-sm text-stone-400 hidden sm:block">Фабрика межкомнатных дверей «Афтора»</p>
          </div>

          {/* Bell */}
          <div className="relative" ref={bellRef}>
            <button onClick={() => setBellOpen(v => !v)} className="relative p-2 rounded-lg hover:bg-stone-100 text-stone-600">
              <Bell size={20} />
              {unread > 0 && <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center">{unread > 9 ? '9+' : unread}</span>}
            </button>
            {bellOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-stone-200 overflow-hidden z-50">
                <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100">
                  <p className="font-semibold text-sm text-stone-800">Уведомления</p>
                  {unread > 0 && <button onClick={markAllRead} className="text-xs text-amber-600 hover:underline">Прочитать все</button>}
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifs.length === 0 && <p className="text-sm text-stone-400 px-4 py-6 text-center">Нет уведомлений</p>}
                  {notifs.slice(0, 12).map(n => (
                    <button key={n.id} onClick={() => markRead(n.id)} className={`block w-full text-left px-4 py-3 border-b border-stone-50 hover:bg-stone-50 ${!n.read ? 'bg-amber-50/50' : ''}`}>
                      <p className="text-sm font-medium text-stone-800">{n.title}</p>
                      <p className="text-xs text-stone-500 mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-[11px] text-stone-400 mt-1">{dateTime(n.created_at)}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* User menu */}
          <div className="relative" ref={menuRef}>
            <button onClick={() => setMenuOpen(v => !v)} className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-stone-100">
              <Avatar name={profile?.full_name || ''} size={32} />
              <ChevronDown size={16} className="text-stone-400" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-stone-200 overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-stone-100">
                  <p className="text-sm font-medium text-stone-800 truncate">{profile?.full_name}</p>
                  <p className="text-xs text-stone-500 truncate">{profile?.email}</p>
                  {profile && <span className={`inline-block mt-1.5 text-[10px] px-2 py-0.5 rounded-full ${ROLE_COLOR[profile.role as Role]}`}>{ROLES[profile.role as Role]}</span>}
                </div>
                <button onClick={() => { setMenuOpen(false); nav('/profile'); }} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-stone-600 hover:bg-stone-50"><Settings size={16} /> Профиль</button>
                <button onClick={() => signOut()} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50"><LogOut size={16} /> Выйти</button>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1400px] w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* Mobile close btn */}
      {open && <button className="lg:hidden fixed top-4 right-4 z-50 text-white" onClick={() => setOpen(false)}><X size={24} /></button>}
    </div>
  );
}
