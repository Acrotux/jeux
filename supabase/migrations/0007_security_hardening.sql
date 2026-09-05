-- Limite le bucket avatars en taille et types de fichiers acceptés
update storage.buckets
set file_size_limit = 5242880, -- 5 Mo
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
where id = 'avatars';

-- N'autorise que des pseudos "raisonnables" (lettres/chiffres/espace/-_.),
-- en plus de la longueur déjà contrôlée, pour limiter les risques d'abus
-- d'affichage (le rendu HTML est de toute façon échappé côté client).
alter table public.profiles
  add constraint profiles_pseudo_format
  check (pseudo ~ '^[[:alnum:] _.\-]+$');

-- Plafond de score raisonnable par jeu, pour limiter les insertions
-- fantaisistes envoyées directement à l'API (indépendamment du client web).
alter table public.scores
  add constraint scores_score_max check (score <= 5000);
