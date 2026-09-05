-- Les jeux à plusieurs tests (Musique, Vitesse, Précision) enregistraient
-- leurs scores sous un seul identifiant (ex. "musique"), mélangeant les
-- deux tests. On distingue désormais chaque test avec son propre
-- identifiant, tout en gardant les anciens identifiants valides pour les
-- scores déjà enregistrés.
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
  check (game in (
    'sudoku', 'pendu', 'memory', 'mastermind',
    'musique', 'vitesse', 'precision', -- anciens scores, conservés
    'musique_simon', 'musique_notes',
    'vitesse_frappe', 'vitesse_reaction',
    'precision_visee', 'precision_barre'
  ));
