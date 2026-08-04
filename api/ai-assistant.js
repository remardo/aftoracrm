import supabase from './db-client.js';
import { getProfile, requireProfile, isFactory } from './_auth.js';

// ИИ-агент фабрики «Афтора».
// Назначение: обрабатывать типовые запросы дилеров без участия менеджеров.
// Подход: определение намерения по ключевым словам + поиск по базе знаний и каталогу.
// Если запрос нестандартный — агент собирает контекст и предлагает создать предзаполненное обращение.

const INTENTS = {
  order_status: ['статус', 'где заказ', 'когда будет', 'когда придет', 'когда достав', 'что с заказ', 'отследить', 'мои заказ', 'мои заказы', 'заказ ид', 'заказ af', 'на каком этапе', 'готов ли заказ', 'отгруз'],
  product_selection: ['подобрать', 'посоветуй', 'выбрать', 'какую дверь', 'какие двери', 'нужна дверь', 'для спальни', 'в спальню', 'в ванную', 'в туалет', 'в детскую', 'в офис', 'в кухн', 'недорог', 'бюджет', 'дешев', 'премиум', 'подар', 'под монтаж', 'дизайн', 'интерьер', 'стиль'],
  product_info: ['характеристики', 'размер', 'размеры', 'цвет', 'цвета', 'материал', 'стекло', 'остеклен', 'толщин', 'петл', 'цен', 'сколько стоит', 'стоит', 'в наличии', 'срок', 'производств', 'доступн', 'можно ли', 'нестандарт', 'нестандар', 'коробк', 'наличник', 'добор'],
  claim: ['рекламация', 'брак', 'дефект', 'поврежд', 'сломал', 'царапин', 'скол', 'вмятин', 'не тот', 'перепутал', 'ошибк', 'некачеств', 'треснул', 'отслоил'],
  knowledge: ['как', 'что такое', 'условия', 'оплата', 'рассрочк', 'доставка', 'возврат', 'гаранти', 'скидк', 'договор', 'дилер', 'сертификат', 'монтаж', 'уход', 'эксплуат', 'хранен', 'влажност', 'температ'],
};

function detectIntent(text) {
  const lower = (text || '').toLowerCase();
  let best = null, bestScore = 0;
  for (const [intent, words] of Object.entries(INTENTS)) {
    let score = 0;
    for (const w of words) if (lower.includes(w)) score++;
    if (score > bestScore) { bestScore = score; best = intent; }
  }
  return { intent: bestScore > 0 ? best : 'unknown', score: bestScore };
}

function snippet(text, len = 220) {
  const t = (text || '').replace(/\s+/g, ' ').trim();
  return t.length > len ? t.slice(0, len).trim() + '…' : t;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const { user, profile, error } = await getProfile(req, supabase);
    if (error) return res.status(401).json({ error });
    if (!requireProfile(profile, res)) return;

    if (req.method !== 'POST') return res.status(405).json({ error: 'Метод не поддерживается' });

    const { message, history = [], conversation_id } = req.body;
    if (!message || !message.trim()) return res.status(400).json({ error: 'Пустое сообщение' });

    const { intent } = detectIntent(message);
    const lower = message.toLowerCase();

    let reply = '';
    let articles = [];
    let products = [];
    let orders = [];
    let actions = [];
    let canAutoResolve = true;
    let suggestedTicket = null;

    // --- ORDER STATUS ---
    if (intent === 'order_status') {
      if (!isFactory(profile) && profile.dealer_id) {
        const { data: ords } = await supabase.from('orders').select('order_number,status,total_amount,created_at,requested_delivery_date,dealer_name')
          .eq('dealer_id', profile.dealer_id).order('created_at', { ascending: false }).limit(6);
        orders = ords || [];
        if (orders.length) {
          const lines = orders.map(o => `• ${o.order_number} — ${statusLabel(o.status)}${o.requested_delivery_date ? `, жел. доставка ${o.requested_delivery_date}` : ''}`).join('\n');
          reply = `Вот актуальные статусы ваших заказов:\n\n${lines}\n\nПодробный трекинг каждого этапа доступен в разделе «Заказы». Если нужна конкретика по позициям — откройте заказ.`;
          actions.push({ label: 'Перейти к заказам', to: '/orders' });
        } else {
          reply = 'У вашей компании пока нет заказов в системе. Оформить новый можно в разделе «Заказы» через конструктор заказа.';
          actions.push({ label: 'Создать заказ', to: '/orders/new' });
        }
      } else {
        reply = 'Чтобы показать статус заказа, укажите его номер (например, AF-2024-1001). Полный список доступен в разделе «Заказы».';
        actions.push({ label: 'Открыть заказы', to: '/orders' });
      }
    }

    // --- PRODUCT SELECTION ---
    else if (intent === 'product_selection') {
      let pool = [];
      const { data: all } = await supabase.from('products').select('*').order('id', { ascending: true });
      pool = all || [];

      const budget = /недорог|бюджет|дешев/.test(lower);
      const premium = /премиум|элит|дорог|подар|классик/.test(lower);
      const bathroom = /ванны|ванная|туалет|санузел/.test(lower);
      const glass = /стекл|лофт|прозрачн|свет/.test(lower);
      const kids = /детск|дети|ребен/.test(lower);
      const bedroom = /спальн|гости|кабинет|офис|комнат/.test(lower);

      let recs = pool;
      if (budget) recs = pool.filter(p => Number(p.base_price) < 7000);
      else if (premium) recs = recs.filter(p => Number(p.base_price) > 18000 || /Классик|массив/i.test(p.material));
      if (bathroom) recs = pool.filter(p => /эмаль|массив/i.test(p.material) || /влагосто|эмаль/i.test(JSON.stringify(p.specs || {})));
      if (glass) recs = pool.filter(p => p.glass);
      if (kids) recs = pool.filter(p => /эмаль|экошпон/i.test(p.material));
      if (bedroom && recs.length > 4) recs = recs.filter(p => /Лайн|Классик|Эко/.test(p.collection_name || ''));
      if (!recs.length) recs = pool;
      recs = recs.slice(0, 4);

      products = recs.map(p => ({ id: p.id, name: p.name, model_code: p.model_code, collection_name: p.collection_name, base_price: p.base_price, glass: p.glass, stock_status: p.stock_status, production_days: p.production_days }));
      let reasoning = 'Подобрал варианты по вашему запросу';
      if (budget) reasoning += ': бюджетный сегмент (коллекция «Эко»), оптимальное соотношение цены и качества';
      if (bathroom) reasoning += ' с учётом повышенной влажности (предпочтительны эмаль/массив)';
      if (glass) reasoning += ' со стеклянными вставками в стиле лофт';
      if (premium) reasoning += ' премиального сегмента';
      reasoning += '. Сроки производства указаны в карточке. Проверить возможность изготовления и добавить в заказ можно в каталоге.';
      reply = reasoning;
      actions.push({ label: 'Открыть каталог', to: '/catalog' });
      actions.push({ label: 'Создать заказ', to: '/orders/new' });
    }

    // --- PRODUCT INFO ---
    else if (intent === 'product_info') {
      // try to find a product mentioned by name/code
      const { data: found } = await supabase.from('products').select('*')
        .or(`name.ilike.%${message}%,model_code.ilike.%${message}%`).limit(3);
      if (found && found.length) {
        products = found.map(p => ({ id: p.id, name: p.name, model_code: p.model_code, collection_name: p.collection_name, base_price: p.base_price, width_options: p.width_options, height_options: p.height_options, color_options: p.color_options, glass: p.glass, stock_status: p.stock_status, production_days: p.production_days, specs: p.specs }));
        const p = found[0];
        reply = `По модели ${p.name} (${p.model_code}):\n• Материал: ${p.material}, отделка: ${p.finish}\n• Размеры: ширина ${p.width_options}, высота ${p.height_options}\n• Цвета: ${p.color_options}\n• Остекление: ${p.glass ? 'да' : 'нет'}\n• Базовая цена: ${Number(p.base_price).toLocaleString('ru-RU')} ₽\n• Наличие: ${stockLabel(p.stock_status)}, срок производства: ${p.production_days} дн.\n\nДилерская цена рассчитывается с учётом вашей скидки в конструкторе заказа.`;
        actions.push({ label: 'Открыть карточку', to: `/catalog/${p.id}` });
        actions.push({ label: 'Добавить в заказ', to: '/orders/new' });
      } else {
        // general product info from KB
        const { data: arts } = await supabase.from('knowledge_base').select('*').eq('category', 'product').limit(5);
        articles = (arts || []).map(a => ({ id: a.id, title: a.title, category: a.category, snippet: snippet(a.content) }));
        reply = 'Расскажу подробнее. Вот статьи о продукции и комплектации. Уточните модель или параметр (размеры, цвет, материал) — и я дам точные характеристики.';
        actions.push({ label: 'Каталог продукции', to: '/catalog' });
      }
    }

    // --- CLAIM ---
    else if (intent === 'claim') {
      canAutoResolve = false;
      reply = 'Для рекламации создайте официальное обращение в разделе «Рекламации» — это ускорит расследование. Я подготовлю черновик с контекстом. Укажите, пожалуйста: номер заказа (если есть), модель двери, тип дефекта и количество. Рекламации рассматриваются до 3 рабочих дней.';
      suggestedTicket = {
        category: 'other',
        subject: 'Рекламация: ' + (message.slice(0, 60) || 'дефект продукции'),
        description: `Запрос из ИИ-ассистента:\n${message}\n\n(Дополните: номер заказа, модель, тип дефекта, количество)`,
      };
      actions.push({ label: 'Оформить рекламацию', to: '/claims' });
      actions.push({ label: 'Создать обращение', to: '/tickets' });
    }

    // --- KNOWLEDGE / FAQ ---
    else {
      const words = message.toLowerCase().split(/[^а-яёa-z0-9]+/i).filter(w => w.length > 3);
      let arts = [];
      if (words.length) {
        const orQ = words.map(w => `title.ilike.%${w}%,content.ilike.%${w}%,tags.ilike.%${w}%`).join(',');
        const { data } = await supabase.from('knowledge_base').select('*').or(orQ).limit(5);
        arts = data || [];
      }
      if (!arts.length) {
        const { data } = await supabase.from('knowledge_base').select('*').limit(5);
        arts = data || [];
      }
      articles = arts.map(a => ({ id: a.id, title: a.title, category: a.category, snippet: snippet(a.content) }));
      if (arts.length) {
        reply = 'Нашёл для вас материалы из базы знаний. Вот релевантные статьи:';
        actions.push({ label: 'Вся база знаний', to: '/knowledge' });
      } else {
        reply = 'Я не нашёл готового ответа на этот вопрос. Сформулирую обращение для менеджера фабрики, чтобы вопрос решился быстрее.';
        canAutoResolve = false;
        suggestedTicket = {
          category: 'other',
          subject: message.slice(0, 80) || 'Вопрос дилера',
          description: `Запрос из ИИ-ассистента:\n${message}`,
        };
        actions.push({ label: 'Создать обращение', to: '/tickets' });
      }
    }

    // persist conversation
    const convMessages = [...history.map(h => ({ role: h.role, content: h.content, ts: new Date().toISOString() })), { role: 'user', content: message }, { role: 'assistant', content: reply }];
    let convId = conversation_id;
    if (convId) {
      await supabase.from('ai_conversations').update({ messages: convMessages, intent, resolved: canAutoResolve, updated_at: new Date().toISOString() }).eq('id', convId);
    } else {
      const { data: conv } = await supabase.from('ai_conversations').insert({
        user_email: user.email, messages: convMessages, intent, resolved: canAutoResolve,
      }).select().single();
      convId = conv?.id || null;
    }

    return res.status(200).json({
      reply, intent, articles, products, orders, actions,
      canAutoResolve, suggestedTicket, conversation_id: convId,
    });
  } catch (err) {
    console.error('ai-assistant error:', err);
    res.status(500).json({ error: err.message });
  }
}

function statusLabel(s) {
  const m = { draft: 'Черновик', submitted: 'На согласовании', confirmed: 'Согласован', in_production: 'В производстве', ready: 'Готов к отгрузке', shipped: 'Отгружен', delivered: 'Доставлен', cancelled: 'Отменён' };
  return m[s] || s;
}
function stockLabel(s) {
  const m = { in_stock: 'В наличии', on_order: 'Под заказ', discontinued: 'Снят с производства' };
  return m[s] || s;
}
