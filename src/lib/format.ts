export function money(v: any): string {
  const n = Number(v || 0);
  return n.toLocaleString('ru-RU') + ' ₽';
}
export function num(v: any): string {
  return Number(v || 0).toLocaleString('ru-RU');
}
export function dateShort(v?: string | null): string {
  if (!v) return '—';
  const d = new Date(v);
  if (isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
export function dateTime(v?: string | null): string {
  if (!v) return '—';
  const d = new Date(v);
  if (isNaN(d.getTime())) return String(v);
  return d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
export function initials(name?: string | null): string {
 if (!name) return '?';
 const parts = name.trim().split(/\s+/);
 return (parts[0]?.[0] || '') + (parts[1]?.[0] || '');
}
