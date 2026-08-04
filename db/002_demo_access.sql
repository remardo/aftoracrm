create extension if not exists pgcrypto;

insert into auth.instances (id, uuid, raw_base_config, created_at, updated_at)
values ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', '{}', now(), now())
on conflict (id) do nothing;

insert into aftora_crm.dealers (name, legal_name, inn, city, status)
select 'Демо-дилер', 'ООО «Демо-дилер»', '0000000000', 'Москва', 'active'
where not exists (select 1 from aftora_crm.dealers where inn = '0000000000');

with demo_users(email, full_name, role, dealer) as (
  values
    ('admin@aftora.ru', 'Руководитель фабрики', 'factory_admin', false),
    ('manager@aftora.ru', 'Менеджер фабрики', 'factory_manager', false),
    ('dealer@aftora.ru', 'Администратор дилера', 'dealer_admin', true),
    ('dm@aftora.ru', 'Менеджер дилера', 'dealer_manager', true)
), users_upserted as (
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  select (select id from auth.instances limit 1), gen_random_uuid(), 'authenticated', 'authenticated', email,
    crypt('password123', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, jsonb_build_object('full_name', full_name), now(), now()
  from demo_users
  on conflict (email) where is_sso_user = false do update set
    encrypted_password = excluded.encrypted_password, email_confirmed_at = now(), updated_at = now(), deleted_at = null
  returning id, email
)
insert into aftora_crm.profiles (user_id, email, full_name, role, dealer_id, status)
select u.id, d.email, d.full_name, d.role,
  case when d.dealer then (select id from aftora_crm.dealers where inn = '0000000000') else null end,
  'active'
from demo_users d join users_upserted u using (email)
on conflict (email) do update set
  user_id = excluded.user_id, full_name = excluded.full_name, role = excluded.role,
  dealer_id = excluded.dealer_id, status = 'active';

update auth.users
set instance_id = '00000000-0000-0000-0000-000000000000', encrypted_password = crypt('password123', gen_salt('bf')),
  confirmation_token = '', recovery_token = '', email_change_token_new = '', email_change = '', email_change_token_current = '', reauthentication_token = ''
where email in ('admin@aftora.ru', 'manager@aftora.ru', 'dealer@aftora.ru', 'dm@aftora.ru');
