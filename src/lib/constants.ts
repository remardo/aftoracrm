import type { Role } from './types';

export const ROLES: Record<Role, string> = {
  factory_admin: 'Руководство фабрики',
  factory_manager: 'Менеджер фабрики',
  dealer_admin: 'Администратор дилера',
  dealer_manager: 'Менеджер дилера',
};

export const ROLE_COLOR: Record<Role, string> = {
  factory_admin: 'bg-amber-100 text-amber-800',
  factory_manager: 'bg-sky-100 text-sky-800',
  dealer_admin: 'bg-emerald-100 text-emerald-800',
  dealer_manager: 'bg-slate-100 text-slate-700',
};

export const ORDER_STATUS: Record<string, { label: string; color: string; step: number }> = {
  draft: { label: 'Черновик', color: 'slate', step: 0 },
  submitted: { label: 'На согласовании', color: 'amber', step: 1 },
  confirmed: { label: 'Согласован', color: 'blue', step: 2 },
  in_production: { label: 'В производстве', color: 'blue', step: 3 },
  ready: { label: 'Готов к отгрузке', color: 'indigo', step: 4 },
  shipped: { label: 'Отгружен', color: 'purple', step: 5 },
  delivered: { label: 'Доставлен', color: 'green', step: 6 },
  cancelled: { label: 'Отменён', color: 'red', step: -1 },
};

export const ORDER_FLOW = ['submitted', 'confirmed', 'in_production', 'ready', 'shipped', 'delivered'];

export const TICKET_STATUS: Record<string, { label: string; color: string }> = {
  open: { label: 'Открыто', color: 'amber' },
  in_progress: { label: 'В работе', color: 'blue' },
  resolved: { label: 'Решено', color: 'green' },
  escalated: { label: 'Эскалировано', color: 'red' },
  closed: { label: 'Закрыто', color: 'slate' },
};

export const TICKET_CATEGORY: Record<string, string> = {
  product_info: 'Информация о продукции',
  order_status: 'Статус заказа',
  technical: 'Технический вопрос',
  pricing: 'Цены и условия',
  delivery: 'Доставка',
  claim: 'Рекламация',
  other: 'Другое',
};

export const TICKET_PRIORITY: Record<string, { label: string; color: string }> = {
  low: { label: 'Низкий', color: 'slate' },
  medium: { label: 'Средний', color: 'amber' },
  high: { label: 'Высокий', color: 'orange' },
  urgent: { label: 'Срочный', color: 'red' },
};

export const CLAIM_STATUS: Record<string, { label: string; color: string }> = {
  submitted: { label: 'Подана', color: 'amber' },
  investigating: { label: 'Расследуется', color: 'blue' },
  accepted: { label: 'Принята', color: 'indigo' },
  rejected: { label: 'Отклонена', color: 'red' },
  resolved: { label: 'Решена', color: 'green' },
};

export const DEFECT_TYPE: Record<string, string> = {
  manufacturing: 'Производственный брак',
  transport: 'Повреждение при транспортировке',
  wrong_product: 'Неверная продукция',
  комплектация: 'Некомплект',
  other: 'Другое',
};

export const STOCK_STATUS: Record<string, { label: string; color: string }> = {
  in_stock: { label: 'В наличии', color: 'green' },
  on_order: { label: 'Под заказ', color: 'amber' },
  discontinued: { label: 'Снят с производства', color: 'red' },
};

export const KNOWLEDGE_CATEGORY: Record<string, string> = {
  product: 'Продукция',
  ordering: 'Заказы',
  delivery: 'Доставка',
  payment: 'Оплата',
  technical: 'Техническое',
  policy: 'Политика',
};

export const BADGE_COLORS: Record<string, string> = {
  slate: 'bg-slate-100 text-slate-700 ring-slate-200',
  green: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
  amber: 'bg-amber-100 text-amber-800 ring-amber-200',
  red: 'bg-rose-100 text-rose-700 ring-rose-200',
  blue: 'bg-sky-100 text-sky-700 ring-sky-200',
  indigo: 'bg-indigo-100 text-indigo-700 ring-indigo-200',
  purple: 'bg-violet-100 text-violet-700 ring-violet-200',
  orange: 'bg-orange-100 text-orange-700 ring-orange-200',
};

export function isFactory(p?: { role: string } | null): boolean {
  return !!p && (p.role === 'factory_admin' || p.role === 'factory_manager');
}
export function isFactoryAdmin(p?: { role: string } | null): boolean {
  return !!p && p.role === 'factory_admin';
}
export function isDealer(p?: { role: string } | null): boolean {
  return !!p && (p.role === 'dealer_admin' || p.role === 'dealer_manager');
}
