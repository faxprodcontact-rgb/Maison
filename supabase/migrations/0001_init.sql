-- Maison : schéma initial
-- Courses, tâches, budget et entretien, partagés entre les membres du foyer.
--
-- Ce projet Supabase est partagé avec d'autres applications : toutes les tables
-- de Maison sont préfixées « maison_ », les fonctions internes sont dans le schéma
-- « maison_prive », et rien ici ne modifie les tables ou les droits des autres apps.
-- Seuls les comptes reliés dans maison_membres peuvent lire ou modifier les données.

-- ---------------------------------------------------------------------------
-- Membres du foyer
-- ---------------------------------------------------------------------------
create table public.maison_membres (
  cle      text primary key,
  prenom   text not null,
  couleur  text not null,
  user_id  uuid unique references auth.users(id) on delete set null,
  cree_le  timestamptz not null default now()
);

insert into public.maison_membres (cle, prenom, couleur) values
  ('simon',  'Simon',  '#3A64C8'),
  ('romane', 'Romane', '#D07A1C');

-- Fonctions internes, hors du schéma exposé par l'API
create schema if not exists maison_prive;
grant usage on schema maison_prive to authenticated;

create or replace function maison_prive.est_membre()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.maison_membres where user_id = (select auth.uid())
  );
$$;

revoke all on function maison_prive.est_membre() from public;
grant execute on function maison_prive.est_membre() to authenticated;

-- ---------------------------------------------------------------------------
-- Courses
-- ---------------------------------------------------------------------------
create table public.maison_courses (
  id          uuid primary key default gen_random_uuid(),
  nom         text not null check (length(btrim(nom)) > 0),
  quantite    text,
  rayon       text not null default 'autre',
  coche       boolean not null default false,
  ajoute_par  text references public.maison_membres(cle) on update cascade on delete set null,
  cree_le     timestamptz not null default now(),
  coche_le    timestamptz
);
create index maison_courses_ajoute_par_idx on public.maison_courses (ajoute_par);

-- Mémoire des articles déjà achetés : rayon préféré et fréquence
create table public.maison_courses_catalogue (
  nom_normalise  text primary key,
  nom            text not null,
  rayon          text not null,
  nb_achats      integer not null default 0,
  dernier_achat  timestamptz
);

create or replace function maison_prive.courses_memoriser()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  cle_nom text := lower(btrim(new.nom));
begin
  if tg_op = 'INSERT' or new.nom is distinct from old.nom or new.rayon is distinct from old.rayon then
    insert into public.maison_courses_catalogue (nom_normalise, nom, rayon)
    values (cle_nom, btrim(new.nom), new.rayon)
    on conflict (nom_normalise) do update
      set nom = excluded.nom, rayon = excluded.rayon;
  end if;

  if new.coche and (tg_op = 'INSERT' or not old.coche) then
    update public.maison_courses_catalogue
       set nb_achats = nb_achats + 1, dernier_achat = now()
     where nom_normalise = cle_nom;
  end if;

  return new;
end;
$$;

create trigger maison_courses_memoriser
after insert or update on public.maison_courses
for each row execute function maison_prive.courses_memoriser();

-- ---------------------------------------------------------------------------
-- Tâches
-- ---------------------------------------------------------------------------
create table public.maison_taches (
  id          uuid primary key default gen_random_uuid(),
  titre       text not null check (length(btrim(titre)) > 0),
  qui         text references public.maison_membres(cle) on update cascade on delete set null, -- null = nous deux
  echeance    date,
  repetition  text not null default 'aucune'
              check (repetition in ('aucune', 'jour', 'semaine', 'mois', 'annee')),
  intervalle  integer not null default 1 check (intervalle between 1 and 365),
  fait_le     timestamptz,
  fait_par    text references public.maison_membres(cle) on update cascade on delete set null,
  notes       text,
  cree_le     timestamptz not null default now()
);
create index maison_taches_qui_idx on public.maison_taches (qui);
create index maison_taches_fait_par_idx on public.maison_taches (fait_par);
create index maison_taches_echeance_idx on public.maison_taches (echeance);

create table public.maison_taches_historique (
  id        uuid primary key default gen_random_uuid(),
  tache_id  uuid references public.maison_taches(id) on delete set null,
  titre     text not null,
  fait_par  text references public.maison_membres(cle) on update cascade on delete set null,
  fait_le   timestamptz not null default now()
);
create index maison_taches_historique_tache_idx on public.maison_taches_historique (tache_id);
create index maison_taches_historique_fait_par_idx on public.maison_taches_historique (fait_par);

-- ---------------------------------------------------------------------------
-- Budget
-- ---------------------------------------------------------------------------
create table public.maison_depenses (
  id                 uuid primary key default gen_random_uuid(),
  montant            numeric(10, 2) not null check (montant > 0),
  libelle            text,
  categorie          text not null default 'autre',
  paye_par           text not null references public.maison_membres(cle) on update cascade,
  pour               text references public.maison_membres(cle) on update cascade, -- null = partagé moitié-moitié
  le                 date not null default current_date,
  est_remboursement  boolean not null default false,
  cree_le            timestamptz not null default now()
);
create index maison_depenses_le_idx on public.maison_depenses (le);
create index maison_depenses_paye_par_idx on public.maison_depenses (paye_par);
create index maison_depenses_pour_idx on public.maison_depenses (pour);

-- Totaux par payeur et bénéficiaire, pour calculer qui doit combien à qui
create view public.maison_budget_soldes
with (security_invoker = true)
as
  select paye_par, pour, sum(montant)::numeric(12, 2) as total
  from public.maison_depenses
  group by paye_par, pour;

-- ---------------------------------------------------------------------------
-- Entretien
-- ---------------------------------------------------------------------------
create table public.maison_entretien (
  id              uuid primary key default gen_random_uuid(),
  titre           text not null check (length(btrim(titre)) > 0),
  categorie       text not null default 'maison',
  frequence_mois  integer check (frequence_mois between 1 and 240), -- null = une seule fois
  prochaine       date,
  derniere        date,
  notes           text,
  cree_le         timestamptz not null default now()
);
create index maison_entretien_prochaine_idx on public.maison_entretien (prochaine);

create table public.maison_entretien_historique (
  id            uuid primary key default gen_random_uuid(),
  entretien_id  uuid not null references public.maison_entretien(id) on delete cascade,
  fait_le       date not null default current_date,
  cout          numeric(10, 2) check (cout >= 0),
  notes         text,
  fait_par      text references public.maison_membres(cle) on update cascade on delete set null,
  cree_le       timestamptz not null default now()
);
create index maison_entretien_historique_entretien_idx on public.maison_entretien_historique (entretien_id);
create index maison_entretien_historique_fait_par_idx on public.maison_entretien_historique (fait_par);

-- ---------------------------------------------------------------------------
-- Droits : uniquement les membres du foyer connectés.
-- Seules les tables maison_ sont concernées.
-- ---------------------------------------------------------------------------
revoke all on
  public.maison_membres,
  public.maison_courses, public.maison_courses_catalogue,
  public.maison_taches, public.maison_taches_historique,
  public.maison_depenses, public.maison_budget_soldes,
  public.maison_entretien, public.maison_entretien_historique
from anon, authenticated;

grant select, update on public.maison_membres to authenticated;
grant select, insert, update, delete on
  public.maison_courses, public.maison_courses_catalogue,
  public.maison_taches, public.maison_taches_historique,
  public.maison_depenses,
  public.maison_entretien, public.maison_entretien_historique
to authenticated;
grant select on public.maison_budget_soldes to authenticated;

alter table public.maison_membres              enable row level security;
alter table public.maison_courses              enable row level security;
alter table public.maison_courses_catalogue    enable row level security;
alter table public.maison_taches               enable row level security;
alter table public.maison_taches_historique    enable row level security;
alter table public.maison_depenses             enable row level security;
alter table public.maison_entretien            enable row level security;
alter table public.maison_entretien_historique enable row level security;

create policy "Membres : lecture par le foyer" on public.maison_membres
  for select to authenticated using ((select maison_prive.est_membre()));
create policy "Membres : modification par le foyer" on public.maison_membres
  for update to authenticated
  using ((select maison_prive.est_membre())) with check ((select maison_prive.est_membre()));

-- Un compte pas encore relié voit quand même sa propre ligne (pour savoir qui il est)
create policy "Membres : chacun voit sa ligne" on public.maison_membres
  for select to authenticated using (user_id = (select auth.uid()));

create policy "Foyer uniquement" on public.maison_courses
  for all to authenticated using ((select maison_prive.est_membre())) with check ((select maison_prive.est_membre()));
create policy "Foyer uniquement" on public.maison_courses_catalogue
  for all to authenticated using ((select maison_prive.est_membre())) with check ((select maison_prive.est_membre()));
create policy "Foyer uniquement" on public.maison_taches
  for all to authenticated using ((select maison_prive.est_membre())) with check ((select maison_prive.est_membre()));
create policy "Foyer uniquement" on public.maison_taches_historique
  for all to authenticated using ((select maison_prive.est_membre())) with check ((select maison_prive.est_membre()));
create policy "Foyer uniquement" on public.maison_depenses
  for all to authenticated using ((select maison_prive.est_membre())) with check ((select maison_prive.est_membre()));
create policy "Foyer uniquement" on public.maison_entretien
  for all to authenticated using ((select maison_prive.est_membre())) with check ((select maison_prive.est_membre()));
create policy "Foyer uniquement" on public.maison_entretien_historique
  for all to authenticated using ((select maison_prive.est_membre())) with check ((select maison_prive.est_membre()));

-- ---------------------------------------------------------------------------
-- Temps réel : chaque changement s'affiche aussitôt sur l'autre téléphone
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table
  public.maison_courses, public.maison_courses_catalogue,
  public.maison_taches,
  public.maison_depenses,
  public.maison_entretien, public.maison_entretien_historique;
