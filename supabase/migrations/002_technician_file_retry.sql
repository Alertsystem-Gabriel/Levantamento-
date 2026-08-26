-- Permite que o técnico substitua ou remova somente arquivos da própria pasta.
-- Necessário para repetir com segurança um envio que foi interrompido.
create policy "technicians update own report files" on storage.objects for update to authenticated
using (bucket_id = 'reports' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'reports' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "technicians delete own report files" on storage.objects for delete to authenticated
using (bucket_id = 'reports' and (storage.foldername(name))[1] = auth.uid()::text);

