-- Mervans : notifications sur les téléphones
--
-- La base prévient la fonction « mervans-notifications » (Supabase Edge Function) quand
-- un petit mot arrive, qu'on y réagit, ou qu'une question de l'agenda est posée ou
-- reçoit une réponse ; et chaque matin à 8 h (heure de Paris) pour le résumé du jour.
-- Le secret partagé est dans le coffre-fort (Vault) sous le nom « mervans_secret_appel ».

create extension if not exists pg_net;
create extension if not exists pg_cron;

create or replace function maison_prive.appeler_notifications(corps jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  secret text;
begin
  select decrypted_secret into secret from vault.decrypted_secrets where name = 'mervans_secret_appel';
  if secret is null then
    return;
  end if;
  perform net.http_post(
    url := 'https://wikrrdtmxckgyfgyvvhr.supabase.co/functions/v1/mervans-notifications',
    body := corps,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-mervans-secret', secret),
    timeout_milliseconds := 15000
  );
end;
$$;
revoke all on function maison_prive.appeler_notifications(jsonb) from public, anon, authenticated;

create or replace function maison_prive.notifier()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform maison_prive.appeler_notifications(jsonb_build_object(
    'prefixe', 'maison_',
    'table', tg_table_name,
    'operation', tg_op,
    'nouveau', to_jsonb(new),
    'ancien', case when tg_op = 'UPDATE' then to_jsonb(old) end
  ));
  return null;
end;
$$;
revoke all on function maison_prive.notifier() from public, anon, authenticated;

create trigger maison_messages_notifier
after insert on public.maison_messages
for each row execute function maison_prive.notifier();

create trigger maison_messages_reaction_notifier
after update of reaction on public.maison_messages
for each row when (new.reaction is distinct from old.reaction and new.reaction is not null)
execute function maison_prive.notifier();

create trigger maison_evenements_notifier
after insert on public.maison_evenements
for each row execute function maison_prive.notifier();

create trigger maison_evenements_reponse_notifier
after update of statut, le on public.maison_evenements
for each row when (new.statut is distinct from old.statut or new.le is distinct from old.le)
execute function maison_prive.notifier();

-- Résumé du matin : la tâche tourne à 6 h et 7 h UTC, la fonction n'agit qu'à 8 h à Paris
-- (été comme hiver).
select cron.schedule(
  'mervans-matin',
  '0 6,7 * * *',
  $$select maison_prive.appeler_notifications('{"prefixe": "maison_", "type": "matin"}'::jsonb)$$
);
