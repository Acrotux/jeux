-- Profils joueurs (1:1 avec auth.users)
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  pseudo text unique not null check (char_length(pseudo) between 2 and 20),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Les profils sont visibles par tous"
  on public.profiles for select
  using (true);

create policy "Un joueur ne modifie que son propre profil"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Un joueur ne met à jour que son propre profil"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Scores (un score par partie jouée)
create table public.scores (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  game text not null check (game in ('sudoku', 'pendu', 'memory', 'mastermind', 'musique')),
  score integer not null check (score >= 0),
  created_at timestamptz not null default now()
);

create index scores_user_id_idx on public.scores (user_id);
create index scores_game_idx on public.scores (game);
create index scores_created_at_idx on public.scores (created_at);

alter table public.scores enable row level security;

create policy "Les scores sont visibles par tous"
  on public.scores for select
  using (true);

create policy "Un joueur n'insère que ses propres scores"
  on public.scores for insert
  with check (auth.uid() = user_id);

-- Classement général (points cumulés, tous jeux confondus)
create view public.leaderboard_overall
  with (security_invoker = true) as
  select p.id as user_id, p.pseudo, coalesce(sum(s.score), 0)::bigint as points
  from public.profiles p
  left join public.scores s on s.user_id = p.id
  group by p.id, p.pseudo;

-- Classement par jeu (points cumulés)
create view public.leaderboard_by_game
  with (security_invoker = true) as
  select p.id as user_id, p.pseudo, s.game, sum(s.score)::bigint as points
  from public.profiles p
  join public.scores s on s.user_id = p.id
  group by p.id, p.pseudo, s.game;
