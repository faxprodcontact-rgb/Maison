-- Mervans : pense-bête (petites tâches pour un jour précis, avec rappel à une heure choisie)

alter table public.maison_taches
  add column rappel_a time,               -- heure du rappel le jour de l'échéance
  add column rappel_envoye_le timestamptz, -- quand le rappel est parti (pour ne l'envoyer qu'une fois)
  add column cree_par text references public.maison_membres(cle) on update cascade on delete set null;
create index maison_taches_cree_par_idx on public.maison_taches (cree_par);

alter table public.maison_membres add column notif_taches boolean not null default true;

-- Si la date ou l'heure du rappel change (ou qu'une tâche répétée passe à la suivante),
-- le rappel pourra repartir
create or replace function maison_prive.taches_rappel_a_refaire()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.echeance is distinct from old.echeance or new.rappel_a is distinct from old.rappel_a then
    new.rappel_envoye_le := null;
  end if;
  return new;
end;
$$;

create trigger maison_taches_rappel_a_refaire
before update on public.maison_taches
for each row execute function maison_prive.taches_rappel_a_refaire();

-- Prévenir tout de suite la personne à qui on ajoute quelque chose
create trigger maison_taches_notifier
after insert on public.maison_taches
for each row execute function maison_prive.notifier();

-- Les rappels à l'heure : vérifiés tous les quarts d'heure
select cron.schedule(
  'mervans-rappels',
  '*/15 * * * *',
  $$select maison_prive.appeler_notifications('{"prefixe": "maison_", "type": "rappels"}'::jsonb)$$
);
