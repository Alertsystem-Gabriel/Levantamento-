-- Evita que a validação do perfil do técnico seja bloqueada pela própria RLS.
create or replace function public.is_active_technician()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'technician'
      and active
  )
$$;

drop policy if exists "technicians insert reports" on public.reports;

create policy "technicians insert reports"
on public.reports
for insert
to authenticated
with check (
  created_by = auth.uid()
  and public.is_active_technician()
);

grant execute on function public.is_active_technician() to authenticated;

