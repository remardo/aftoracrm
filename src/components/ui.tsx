import { ReactNode, InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes, ButtonHTMLAttributes } from 'react';
import { BADGE_COLORS } from '../lib/constants';
import { Loader2, X } from 'lucide-react';

export function Spinner({ className = '' }: { className?: string }) {
  return <Loader2 className={`animate-spin text-amber-600 ${className}`} size={28} />;
}

export function Card({ children, className = '', onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return <div onClick={onClick} className={`rounded-2xl border border-stone-200 bg-white shadow-sm ${className}`}>{children}</div>;
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-800 tracking-tight">{title}</h1>
        {subtitle && <p className="text-stone-500 mt-1 text-sm">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'outline' | 'danger' | 'subtle';
  size?: 'sm' | 'md';
}
export function Button({ variant = 'primary', size = 'md', className = '', children, ...rest }: BtnProps) {
  const base = 'inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none';
  const sizes = { sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2.5 text-sm' }[size];
  const variants = {
    primary: 'bg-amber-600 text-white hover:bg-amber-700 shadow-sm',
    outline: 'border border-stone-300 text-stone-700 hover:bg-stone-50 bg-white',
    ghost: 'text-stone-600 hover:bg-stone-100',
    danger: 'bg-rose-600 text-white hover:bg-rose-700',
    subtle: 'bg-amber-50 text-amber-800 hover:bg-amber-100',
  }[variant];
  return <button className={`${base} ${sizes} ${variants} ${className}`} {...rest}>{children}</button>;
}

export function Badge({ label, color = 'slate' }: { label: string; color?: string }) {
  const c = BADGE_COLORS[color] || BADGE_COLORS.slate;
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${c}`}>{label}</span>;
}

export function Field({ label, required, error, children, hint }: { label: string; required?: boolean; error?: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-stone-700 mb-1.5">{label}{required && <span className="text-rose-500"> *</span>}</span>
      {children}
      {hint && !error && <span className="block text-xs text-stone-400 mt-1">{hint}</span>}
      {error && <span className="block text-xs text-rose-600 mt-1">{error}</span>}
    </label>
  );
}

const inputCls = 'w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-800 placeholder-stone-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 outline-none transition';

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputCls} ${props.className || ''}`} />;
}
export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${inputCls} ${props.className || ''}`} />;
}
export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${inputCls} ${props.className || ''}`} />;
}

export function EmptyState({ icon, title, hint, action }: { icon?: ReactNode; title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-stone-300 mb-3">{icon}</div>
      <p className="text-stone-600 font-medium">{title}</p>
      {hint && <p className="text-stone-400 text-sm mt-1 max-w-md">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Modal({ open, onClose, title, children, size = 'md' }: { open: boolean; onClose: () => void; title: string; children: ReactNode; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  if (!open) return null;
  const w = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }[size];
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative z-10 w-full ${w} my-8 rounded-2xl bg-white shadow-xl border border-stone-200`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100 sticky top-0 bg-white rounded-t-2xl">
          <h3 className="font-semibold text-stone-800">{title}</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700 p-1"><X size={18} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function Stat({ label, value, hint, icon, accent = 'amber' }: { label: string; value: ReactNode; hint?: string; icon?: ReactNode; accent?: string }) {
  const accents: Record<string, string> = {
    amber: 'bg-amber-50 text-amber-700',
    blue: 'bg-sky-50 text-sky-700',
    green: 'bg-emerald-50 text-emerald-700',
    red: 'bg-rose-50 text-rose-700',
    purple: 'bg-violet-50 text-violet-700',
    slate: 'bg-slate-100 text-slate-700',
  };
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-stone-500">{label}</p>
          <p className="text-2xl font-bold text-stone-800 mt-1">{value}</p>
          {hint && <p className="text-xs text-stone-400 mt-1">{hint}</p>}
        </div>
        {icon && <div className={`rounded-xl p-2.5 ${accents[accent]}`}>{icon}</div>}
      </div>
    </Card>
  );
}

export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const ini = (name || '?').trim().split(/\s+/).map(s => s[0]).slice(0, 2).join('').toUpperCase();
  return <div className="rounded-full bg-amber-100 text-amber-800 font-semibold flex items-center justify-center" style={{ width: size, height: size, fontSize: size * 0.4 }}>{ini || '?'}</div>;
}

export function Tabs({ tabs, active, onChange }: { tabs: { key: string; label: string; count?: number }[]; active: string; onChange: (k: string) => void }) {
  return (
    <div className="flex gap-1 border-b border-stone-200 overflow-x-auto">
      {tabs.map(t => (
        <button key={t.key} onClick={() => onChange(t.key)} className={`px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition ${active === t.key ? 'border-amber-600 text-amber-700' : 'border-transparent text-stone-500 hover:text-stone-700'}`}>
          {t.label}{t.count != null && <span className="ml-1.5 text-xs text-stone-400">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function ProgressBar({ value }: { value: number }) {
  return <div className="h-2 w-full rounded-full bg-stone-100 overflow-hidden"><div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} /></div>;
}

export function ConfirmInline({ onConfirm, onCancel, label = 'Подтвердить' }: { onConfirm: () => void; onCancel: () => void; label?: string }) {
  return (
    <div className="flex gap-2">
      <Button size="sm" variant="danger" onClick={onConfirm}>{label}</Button>
      <Button size="sm" variant="ghost" onClick={onCancel}>Отмена</Button>
    </div>
  );
}
