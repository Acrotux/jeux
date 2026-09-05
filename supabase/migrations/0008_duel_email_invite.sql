-- Permet de lancer un duel vers une adresse email pas encore inscrite :
-- opponent_id devient facultatif, invited_email prend le relais en attendant.
alter table public.challenges alter column opponent_id drop not null;
alter table public.challenges add column invited_email text;

alter table public.challenges
  add constraint challenges_opponent_or_email
  check (opponent_id is not null or invited_email is not null);

-- Quand une personne invitée par email crée enfin son profil, on rattache
-- automatiquement les duels qui l'attendaient.
create or replace function public.claim_invited_challenges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_user_email text;
begin
  select email into new_user_email from auth.users where id = new.id;

  if new_user_email is not null then
    update public.challenges
    set opponent_id = new.id, invited_email = null
    where invited_email = new_user_email and opponent_id is null;
  end if;

  return new;
end;
$$;

drop trigger if exists on_profile_created_claim_challenges on public.profiles;
create trigger on_profile_created_claim_challenges
  after insert on public.profiles
  for each row execute function public.claim_invited_challenges();
