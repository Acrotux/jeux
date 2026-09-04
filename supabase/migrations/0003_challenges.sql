create table public.challenges (
  id bigint generated always as identity primary key,
  game text not null check (game in ('sudoku', 'pendu', 'memory', 'mastermind', 'musique')),
  challenger_id uuid not null references public.profiles (id) on delete cascade,
  opponent_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  expires_at timestamptz,
  check (challenger_id <> opponent_id)
);

create index challenges_challenger_idx on public.challenges (challenger_id);
create index challenges_opponent_idx on public.challenges (opponent_id);

alter table public.challenges enable row level security;

create policy "Les participants voient leurs défis"
  on public.challenges for select
  using (auth.uid() = challenger_id or auth.uid() = opponent_id);

create policy "On ne peut lancer un défi qu'en son propre nom"
  on public.challenges for insert
  with check (auth.uid() = challenger_id);

create policy "Les participants peuvent mettre à jour le statut"
  on public.challenges for update
  using (auth.uid() = challenger_id or auth.uid() = opponent_id)
  with check (auth.uid() = challenger_id or auth.uid() = opponent_id);
