-- Permet aux participants de supprimer un défi
create policy "Les participants peuvent supprimer un défi"
  on public.challenges for delete
  using (auth.uid() = challenger_id or auth.uid() = opponent_id);

-- Photo de profil
alter table public.profiles add column avatar_url text;

-- Bucket public pour les avatars
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "Avatars visibles par tous"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Chacun ajoute son propre avatar"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Chacun met à jour son propre avatar"
  on storage.objects for update
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Chacun supprime son propre avatar"
  on storage.objects for delete
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
