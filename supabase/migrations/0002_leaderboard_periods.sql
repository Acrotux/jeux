-- Classement paramétrable par période (jour / semaine / mois / trimestre / année / total)
-- et par jeu (ou tous jeux confondus si game_filter est NULL).
create or replace function public.get_leaderboard(
  period text default 'all',
  game_filter text default null,
  limit_count int default 10
)
returns table (pseudo text, points bigint)
language sql
stable
as $$
  select p.pseudo, coalesce(sum(s.score), 0)::bigint as points
  from public.profiles p
  join public.scores s on s.user_id = p.id
  where (game_filter is null or s.game = game_filter)
    and (
      period = 'all'
      or (period = 'day' and s.created_at >= date_trunc('day', now()))
      or (period = 'week' and s.created_at >= date_trunc('week', now()))
      or (period = 'month' and s.created_at >= date_trunc('month', now()))
      or (period = 'quarter' and s.created_at >= date_trunc('quarter', now()))
      or (period = 'year' and s.created_at >= date_trunc('year', now()))
    )
  group by p.pseudo
  order by points desc
  limit limit_count;
$$;

grant execute on function public.get_leaderboard(text, text, int) to anon, authenticated;
