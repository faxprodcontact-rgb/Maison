-- Mervans : messages, agenda, travaux et envies, tâches par pièce, entretien annuel

-- ---------------------------------------------------------------------------
-- Messages entre Simon et Romane
-- ---------------------------------------------------------------------------
create table public.maison_messages (
  id          uuid primary key default gen_random_uuid(),
  de          text not null references public.maison_membres(cle) on update cascade,
  texte       text not null check (length(btrim(texte)) between 1 and 500),
  importance  text not null default 'normal' check (importance in ('doux', 'normal', 'important')),
  cree_le     timestamptz not null default now(),
  lu_le       timestamptz
);
create index maison_messages_de_idx on public.maison_messages (de);
create index maison_messages_cree_le_idx on public.maison_messages (cree_le desc);

-- ---------------------------------------------------------------------------
-- Agenda
-- ---------------------------------------------------------------------------
create table public.maison_evenements (
  id               uuid primary key default gen_random_uuid(),
  titre            text not null check (length(btrim(titre)) > 0),
  le               date not null,
  heure            time,               -- null = toute la journée
  heure_fin        time,
  type             text not null default 'autre'
                   check (type in ('sortie', 'rdv', 'sante', 'famille', 'anniversaire', 'autre')),
  importance       text not null default 'normal' check (importance in ('info', 'normal', 'important')),
  pour             text references public.maison_membres(cle) on update cascade, -- null = nous deux
  notes            text,
  cree_par         text not null references public.maison_membres(cle) on update cascade,
  -- Une question (« Dîner chez Guillaume ? ») attend la réponse de question_a
  statut           text not null default 'confirme' check (statut in ('confirme', 'question', 'refuse')),
  question_a       text references public.maison_membres(cle) on update cascade,
  repondu_le       timestamptz,
  annuel           boolean not null default false,  -- anniversaires : revient chaque année
  annee_naissance  integer check (annee_naissance between 1900 and 2100),
  cree_le          timestamptz not null default now()
);
create index maison_evenements_le_idx on public.maison_evenements (le);
create index maison_evenements_pour_idx on public.maison_evenements (pour);
create index maison_evenements_cree_par_idx on public.maison_evenements (cree_par);
create index maison_evenements_question_a_idx on public.maison_evenements (question_a);

-- ---------------------------------------------------------------------------
-- Travaux à venir et envies (avec lien et prix)
-- ---------------------------------------------------------------------------
create table public.maison_projets (
  id         uuid primary key default gen_random_uuid(),
  genre      text not null check (genre in ('travaux', 'envie')),
  titre      text not null check (length(btrim(titre)) > 0),
  prix       numeric(10, 2) check (prix >= 0),
  lien       text,
  priorite   text not null default 'normale' check (priorite in ('basse', 'normale', 'haute')),
  notes      text,
  fait       boolean not null default false,
  fait_le    date,
  cree_par   text references public.maison_membres(cle) on update cascade on delete set null,
  cree_le    timestamptz not null default now()
);
create index maison_projets_cree_par_idx on public.maison_projets (cree_par);

-- ---------------------------------------------------------------------------
-- Tâches rangées par pièce
-- ---------------------------------------------------------------------------
alter table public.maison_taches
  add column piece text,
  add column genre text not null default 'faire' check (genre in ('faire', 'reparer', 'acheter', 'idee'));

-- ---------------------------------------------------------------------------
-- Entretien : ce qu'il faut faire, quand, et quoi faire quand ça approche
-- ---------------------------------------------------------------------------
alter table public.maison_entretien
  add column rappel text,
  add column mois_conseille integer check (mois_conseille between 1 and 12),
  add column prevenir_jours integer not null default 30 check (prevenir_jours between 0 and 180);

-- Liste de départ : les entretiens courants d'une maison (supprimables)
insert into public.maison_entretien (titre, categorie, frequence_mois, mois_conseille, prevenir_jours, rappel, prochaine)
select titre, categorie, frequence, mois, prevenir, rappel,
       case when mois is null then null
            when make_date(extract(year from current_date)::int, mois, 15) >= current_date
              then make_date(extract(year from current_date)::int, mois, 15)
            else make_date(extract(year from current_date)::int + 1, mois, 15) end
from (values
  ('Entretien de la chaudière', 'chauffage', 12, 9, 30, 'Appelez le chauffagiste pour prendre rendez-vous (entretien obligatoire chaque année).'),
  ('Ramonage', 'chauffage', 12, 9, 30, 'Appelez le ramoneur et gardez le certificat : l''assurance peut le demander.'),
  ('Purger les radiateurs', 'chauffage', 12, 10, 14, 'Chauffage coupé, purgez chaque radiateur avec une clé, puis vérifiez la pression de la chaudière.'),
  ('Détartrer le chauffe-eau', 'chauffage', 24, 4, 30, 'Faites vérifier l''anode et détartrer le ballon d''eau chaude.'),
  ('Entretien de la pompe à chaleur ou de la clim', 'chauffage', 24, 5, 30, 'Appelez un frigoriste : entretien obligatoire tous les 2 ans (supprimez si vous n''en avez pas).'),
  ('Nettoyer les bouches de VMC', 'maison', 6, 3, 14, 'Démontez les bouches d''aération et lavez-les à l''eau savonneuse.'),
  ('Tester les détecteurs de fumée', 'securite', 6, 1, 7, 'Appuyez sur le bouton test de chaque détecteur et changez les piles si besoin.'),
  ('Nettoyer les gouttières', 'maison', 12, 11, 21, 'Retirez les feuilles des gouttières et vérifiez que l''eau s''écoule bien.'),
  ('Vérifier la toiture', 'maison', 12, 10, 21, 'Repérez les tuiles cassées ou déplacées ; appelez un couvreur si besoin.'),
  ('Démoussage de la toiture', 'maison', 60, 4, 30, 'Demandez des devis à un couvreur pour démousser et traiter le toit.'),
  ('Graisser la porte de garage', 'maison', 12, 4, 14, 'Graissez les rails et les charnières, puis testez la sécurité de fermeture.'),
  ('Entretenir les volets roulants', 'maison', 12, 4, 14, 'Nettoyez les lames et vérifiez que chaque volet monte et descend bien.'),
  ('Vérifier les joints de la salle de bain', 'maison', 24, 5, 14, 'Refaites les joints silicone de la douche ou de la baignoire s''ils noircissent.'),
  ('Fermer le robinet extérieur avant le gel', 'jardin', 12, 11, 14, 'Fermez la vanne du robinet extérieur et videz-le avant les gelées.'),
  ('Révision de la tondeuse', 'jardin', 12, 3, 21, 'Vidange, affûtage de la lame et nettoyage du filtre avant la saison.'),
  ('Tailler les haies', 'jardin', 12, 10, 14, 'Taillez les haies et arbustes (évitez le printemps, période de nidification).'),
  ('Nettoyer le filtre de la hotte', 'electromenager', 3, null, 7, 'Lavez le filtre à graisse au lave-vaisselle ou à l''eau très chaude.'),
  ('Nettoyer le filtre du lave-vaisselle', 'electromenager', 1, null, 3, 'Rincez le filtre au fond de la cuve.'),
  ('Détartrer la machine à laver', 'electromenager', 3, null, 7, 'Lancez un cycle à vide à 90 °C avec du vinaigre blanc ou un détartrant.'),
  ('Dégivrer le congélateur', 'electromenager', 6, null, 7, 'Videz le congélateur dans une glacière et laissez-le dégivrer.'),
  ('Renouvellement de l''assurance habitation', 'contrats', 12, null, 45, 'Comparez les offres avant la date anniversaire du contrat.'),
  ('Taxe foncière', 'administratif', 12, 10, 21, 'Payez la taxe foncière avant mi-octobre, ou vérifiez le prélèvement.'),
  ('Contrôle technique de la voiture', 'voiture', 24, null, 30, 'Prenez rendez-vous au centre de contrôle technique.'),
  ('Révision de la voiture', 'voiture', 12, null, 30, 'Prenez rendez-vous au garage pour la révision.')
) as liste (titre, categorie, frequence, mois, prevenir, rappel);

-- ---------------------------------------------------------------------------
-- Droits et accès : uniquement les membres du foyer
-- ---------------------------------------------------------------------------
revoke all on public.maison_messages, public.maison_evenements, public.maison_projets from anon, authenticated;
grant select, insert, update, delete on public.maison_messages, public.maison_evenements, public.maison_projets to authenticated;

alter table public.maison_messages   enable row level security;
alter table public.maison_evenements enable row level security;
alter table public.maison_projets    enable row level security;

create policy "Foyer uniquement" on public.maison_messages
  for all to authenticated using ((select maison_prive.est_membre())) with check ((select maison_prive.est_membre()));
create policy "Foyer uniquement" on public.maison_evenements
  for all to authenticated using ((select maison_prive.est_membre())) with check ((select maison_prive.est_membre()));
create policy "Foyer uniquement" on public.maison_projets
  for all to authenticated using ((select maison_prive.est_membre())) with check ((select maison_prive.est_membre()));

alter publication supabase_realtime add table
  public.maison_messages, public.maison_evenements, public.maison_projets, public.maison_membres;
