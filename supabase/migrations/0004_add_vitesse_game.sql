-- Autorise le jeu "vitesse" dans scores.game, quel que soit le nom exact
-- généré automatiquement pour la contrainte CHECK existante.
do $$
declare
  con_name text;
begin
  select conname into con_name
  from pg_constraint
  where conrelid = 'public.scores'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%game%';

  if con_name is not null then
    execute format('alter table public.scores drop constraint %I', con_name);
  end if;
end $$;

alter table public.scores
  add constraint scores_game_check
  check (game in ('sudoku', 'pendu', 'memory', 'mastermind', 'musique', 'vitesse'));
