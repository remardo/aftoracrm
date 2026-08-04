grant usage on schema aftora_crm to anon, authenticated, service_role, authenticator;
grant all privileges on all tables in schema aftora_crm to service_role;
grant select, insert, update, delete on all tables in schema aftora_crm to authenticated;
grant usage, select on all sequences in schema aftora_crm to service_role, authenticated;
alter default privileges in schema aftora_crm grant all on tables to service_role;
notify pgrst, 'reload schema';
