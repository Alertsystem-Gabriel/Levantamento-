-- Relatório de Implantação A4 — estrutura inicial
create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('technician', 'admin')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles(id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', 'Acesso livre'), 'technician')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists create_profile_after_signup on auth.users;
create trigger create_profile_after_signup
after insert on auth.users
for each row execute function public.handle_new_auth_user();

create table public.reports (
  id uuid primary key,
  protocol text not null unique,
  created_by uuid not null references public.profiles(id),
  client text not null,
  unit text,
  technician_name text not null,
  report_date date not null,
  installation_mode text not null check (installation_mode in ('core', 'accessory', 'both')),
  vehicle text,
  objective text not null,
  details text not null,
  metadata jsonb not null default '{}'::jsonb,
  pdf_path text not null unique,
  pdf_size bigint not null default 0,
  submitted_at timestamptz not null default now(),
  pdf_removed_at timestamptz,
  created_at timestamptz not null default now()
);

create index reports_date_idx on public.reports(report_date desc);
create index reports_client_idx on public.reports(client);
create index reports_technician_idx on public.reports(technician_name);

alter table public.profiles enable row level security;
alter table public.reports enable row level security;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin' and active) $$;

create or replace function public.is_active_technician()
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.profiles where id = auth.uid() and role = 'technician' and active) $$;

create policy "users read own profile" on public.profiles for select to authenticated using (id = auth.uid() or public.is_admin());
create policy "admins manage profiles" on public.profiles for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Técnicos apenas enviam. Somente administradores consultam relatórios finalizados.
create policy "technicians insert reports" on public.reports for insert to authenticated
with check (created_by = auth.uid() and public.is_active_technician());
create policy "admins read reports" on public.reports for select to authenticated using (public.is_admin());
create policy "admins update reports" on public.reports for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins delete reports" on public.reports for delete to authenticated using (public.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('reports', 'reports', false, 52428800, array['application/pdf'])
on conflict (id) do update set public = false, file_size_limit = 52428800, allowed_mime_types = array['application/pdf'];

create policy "technicians upload own reports" on storage.objects for insert to authenticated
with check (bucket_id = 'reports' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "admins read report files" on storage.objects for select to authenticated
using (bucket_id = 'reports' and public.is_admin());
create policy "admins delete report files" on storage.objects for delete to authenticated
using (bucket_id = 'reports' and public.is_admin());

grant usage on schema public to authenticated;
grant execute on function public.is_active_technician() to authenticated;
grant select on public.profiles to authenticated;
grant insert, select, update, delete on public.reports to authenticated;

-- Execute após criar o primeiro usuário, substituindo os valores:
-- insert into public.profiles(id, full_name, role)
-- values ('UUID_DO_USUARIO', 'Administrador A4', 'admin');

