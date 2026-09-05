-- La table challenges a sa propre contrainte sur `game`, distincte de
-- celle de `scores` : il faut aussi l'étendre aux identifiants par test.
do $$
declare
  con_name text;
begin
  select conname into con_name
  from pg_constraint
  where conrelid = 'public.challenges'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%game%';

  if con_name is not null then
    execute format('alter table public.challenges drop constraint %I', con_name);
  end if;
end $$;

alter table public.challenges
  add constraint challenges_game_check
  check (game in (
    'sudoku', 'pendu', 'memory', 'mastermind',
    'musique', 'vitesse', 'precision', -- anciens duels, conservés
    'musique_simon', 'musique_notes',
    'vitesse_frappe', 'vitesse_reaction',
    'precision_visee', 'precision_barre'
  ));
