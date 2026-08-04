-- ponytail: fixed demo dataset; replace with fixtures only when scenarios need to vary.
insert into aftora_crm.dealers (name, legal_name, inn, city, region, discount_rate, contact_email, contact_phone, status)
values
  ('Дверной дом', 'ООО «Дверной дом»', '7701001001', 'Москва', 'Москва', 18, 'office@doorhome.example', '+7 495 100-10-01', 'active'),
  ('Интерьер Плюс', 'ООО «Интерьер Плюс»', '7802002002', 'Санкт-Петербург', 'Ленинградская область', 15, 'hello@interiorplus.example', '+7 812 200-20-02', 'active'),
  ('Уютный Дом', 'ООО «Уютный Дом»', '5403003003', 'Новосибирск', 'Новосибирская область', 12, 'sale@uyutdom.example', '+7 383 300-30-03', 'active'),
  ('Стиль двери', 'ИП Власов И.А.', '6604004004', 'Екатеринбург', 'Свердловская область', 10, 'info@styledoor.example', '+7 343 400-40-04', 'pending')
on conflict do nothing;

insert into aftora_crm.outlets (dealer_id, name, address, city, phone)
select d.id, v.name, v.address, v.city, v.phone
from (values
  ('7701001001', 'ТЦ «Румер»', 'ул. Ленинская Слобода, 26', 'Москва', '+7 495 100-11-01'),
  ('7701001001', 'Шоурум «Каширский двор»', 'Каширское шоссе, 19', 'Москва', '+7 495 100-11-02'),
  ('7802002002', 'Салон на Московском', 'Московский проспект, 111', 'Санкт-Петербург', '+7 812 200-21-01'),
  ('7802002002', 'ТЦ «Кубатура»', 'ул. Фучика, 9', 'Санкт-Петербург', '+7 812 200-21-02'),
  ('5403003003', 'Салон на Красном', 'Красный проспект, 75', 'Новосибирск', '+7 383 300-31-01'),
  ('6604004004', 'ТЦ «Гулливер»', 'ул. 40-летия Комсомола, 38', 'Екатеринбург', '+7 343 400-41-01')
) as v(inn, name, address, city, phone) join aftora_crm.dealers d on d.inn = v.inn
where not exists (select 1 from aftora_crm.outlets o where o.dealer_id=d.id and o.name=v.name);

insert into aftora_crm.profiles (email, full_name, phone, role, dealer_id, outlet_id, status)
select v.email, v.full_name, v.phone, v.role, d.id, o.id, 'active'
from (values
  ('ivan@doorhome.example', 'Иван Петров', '+7 916 101-01-01', 'dealer_admin', '7701001001', 'ТЦ «Румер»'),
  ('anna@doorhome.example', 'Анна Белова', '+7 916 101-01-02', 'dealer_manager', '7701001001', 'Шоурум «Каширский двор»'),
  ('oleg@interiorplus.example', 'Олег Смирнов', '+7 921 202-02-01', 'dealer_admin', '7802002002', 'Салон на Московском'),
  ('maria@interiorplus.example', 'Мария Волкова', '+7 921 202-02-02', 'dealer_manager', '7802002002', 'ТЦ «Кубатура»'),
  ('sergey@uyutdom.example', 'Сергей Ким', '+7 913 303-03-01', 'dealer_admin', '5403003003', 'Салон на Красном'),
  ('elena@styledoor.example', 'Елена Власова', '+7 912 404-04-01', 'dealer_admin', '6604004004', 'ТЦ «Гулливер»')
) as v(email, full_name, phone, role, inn, outlet_name)
join aftora_crm.dealers d on d.inn=v.inn
left join aftora_crm.outlets o on o.dealer_id=d.id and o.name=v.outlet_name
on conflict (email) do update set full_name=excluded.full_name, phone=excluded.phone, role=excluded.role, dealer_id=excluded.dealer_id, outlet_id=excluded.outlet_id, status='active';

insert into aftora_crm.collections (name, description, price_tier)
values ('Лайн', 'Современные двери с лаконичным профилем', 'standard'), ('Классик', 'Классические модели для интерьеров', 'premium'), ('Эко', 'Практичные модели для проектов', 'economy')
on conflict do nothing;

insert into aftora_crm.products (collection_id, collection_name, name, model_code, material, finish, width_options, height_options, color_options, glass, base_price, stock_status, production_days, specs)
select c.id, c.name, v.name, v.code, v.material, v.finish, '600, 700, 800, 900', '2000', v.colors, v.glass, v.price, v.stock, v.days, '{}'::jsonb
from (values
  ('Лайн', 'Лайн 01', 'LN-01', 'экошпон', 'дуб натуральный', 'дуб, графит', false, 8900, 'in_stock', 7),
  ('Лайн', 'Лайн 02 стекло', 'LN-02', 'экошпон', 'белый матовый', 'белый, графит', true, 11200, 'on_order', 14),
  ('Классик', 'Классик 05', 'CL-05', 'массив', 'эмаль', 'белый, слоновая кость', false, 23900, 'on_order', 21),
  ('Эко', 'Эко 03', 'EC-03', 'экошпон', 'венге', 'венге, капучино', false, 6200, 'in_stock', 5)
) as v(collection_name, name, code, material, finish, colors, glass, price, stock, days)
join aftora_crm.collections c on c.name=v.collection_name
where not exists (select 1 from aftora_crm.products p where p.model_code=v.code);

insert into aftora_crm.orders (order_number, dealer_id, dealer_name, outlet_id, created_by, created_by_name, status, total_amount, comment, requested_delivery_date, created_at, updated_at)
select v.number, d.id, d.name, o.id, v.email, v.author, v.status, v.total, v.comment, current_date + v.delivery_days, now() - (v.age_days || ' days')::interval, now()
from (values
 ('AF-2026-1001','7701001001','ТЦ «Румер»','ivan@doorhome.example','Иван Петров','submitted',71200,'Нужна доставка утром',7,1),
 ('AF-2026-1002','7701001001','Шоурум «Каширский двор»','anna@doorhome.example','Анна Белова','confirmed',89600,'Согласовать цвет наличника',10,3),
 ('AF-2026-1003','7802002002','Салон на Московском','oleg@interiorplus.example','Олег Смирнов','in_production',143400,'Проект гостиницы',14,5),
 ('AF-2026-1004','7802002002','ТЦ «Кубатура»','maria@interiorplus.example','Мария Волкова','ready',55600,'Самовывоз',2,8),
 ('AF-2026-1005','5403003003','Салон на Красном','sergey@uyutdom.example','Сергей Ким','shipped',72800,'Транспортная компания',1,12),
 ('AF-2026-1006','7701001001','ТЦ «Румер»','ivan@doorhome.example','Иван Петров','delivered',103500,'Закрытый заказ',-2,18),
 ('AF-2026-1007','7802002002','Салон на Московском','oleg@interiorplus.example','Олег Смирнов','submitted',49800,'Нестандартная высота',20,2),
 ('AF-2026-1008','5403003003','Салон на Красном','sergey@uyutdom.example','Сергей Ким','cancelled',12400,'Клиент отменил проект',0,10),
 ('AF-2026-1009','6604004004','ТЦ «Гулливер»','elena@styledoor.example','Елена Власова','confirmed',77400,'Первый заказ нового дилера',12,4),
 ('AF-2026-1010','7701001001','Шоурум «Каширский двор»','anna@doorhome.example','Анна Белова','in_production',134800,'Комплектация с доборами',18,6)
) as v(number, inn, outlet_name, email, author, status, total, comment, delivery_days, age_days)
join aftora_crm.dealers d on d.inn=v.inn join aftora_crm.outlets o on o.dealer_id=d.id and o.name=v.outlet_name
where not exists (select 1 from aftora_crm.orders x where x.order_number=v.number);

insert into aftora_crm.order_items (order_id, product_id, product_name, model_code, width, height, color, glass, quantity, unit_price)
select o.id, p.id, p.name, p.model_code, '800', '2000', 'белый', p.glass, 2, p.base_price
from aftora_crm.orders o join aftora_crm.products p on p.model_code = case when o.order_number in ('AF-2026-1003','AF-2026-1010') then 'CL-05' when o.order_number in ('AF-2026-1001','AF-2026-1007') then 'LN-02' else 'LN-01' end
where o.order_number like 'AF-2026-%' and not exists (select 1 from aftora_crm.order_items i where i.order_id=o.id);

insert into aftora_crm.status_log (order_id, status, changed_by, note)
select id, status, 'manager@aftora.ru', 'Тестовый статус заказа' from aftora_crm.orders where order_number like 'AF-2026-%'
and not exists (select 1 from aftora_crm.status_log l where l.order_id=orders.id);

insert into aftora_crm.tickets (ticket_number, dealer_id, dealer_name, created_by, created_by_name, subject, category, priority, status, description, created_at)
select 'TK-601', d.id, d.name, 'ivan@doorhome.example', 'Иван Петров', 'Уточнить срок производства', 'order', 'medium', 'open', 'Нужно подтвердить срок по AF-2026-1001', now()
from aftora_crm.dealers d where d.inn='7701001001' and not exists (select 1 from aftora_crm.tickets where ticket_number='TK-601');

insert into aftora_crm.claims (claim_number, dealer_id, dealer_name, created_by, created_by_name, product_name, defect_type, description, quantity, status)
select 'RM-201', d.id, d.name, 'oleg@interiorplus.example', 'Олег Смирнов', 'Лайн 02 стекло', 'damaged', 'Скол на полотне при приёмке', 1, 'investigating'
from aftora_crm.dealers d where d.inn='7802002002' and not exists (select 1 from aftora_crm.claims where claim_number='RM-201');
