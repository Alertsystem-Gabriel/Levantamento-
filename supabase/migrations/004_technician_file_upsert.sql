-- O upsert do Storage também exige SELECT na pasta do próprio técnico.
create policy "technicians read own report files"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'reports'
  and (storage.foldername(name))[1] = auth.uid()::text
);

