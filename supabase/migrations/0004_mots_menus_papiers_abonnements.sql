-- Mervans : réactions et photos dans les petits mots, menu de la semaine,
-- papiers importants, abonnements aux notifications

-- ---------------------------------------------------------------------------
-- Petits mots : une réaction (de celui qui reçoit) et une photo possible
-- ---------------------------------------------------------------------------
alter table public.maison_messages
  add column reaction text check (reaction in ('❤️', '🥰', '😂', '👍', '🙏')),
  add column photo text;
alter table public.maison_messages drop constraint maison_messages_texte_check;
alter table public.maison_messages add constraint maison_messages_texte_check
  check (length(btrim(texte)) <= 500 and (length(btrim(texte)) > 0 or photo is not null));

-- ---------------------------------------------------------------------------
-- Préférences de notification, par personne
-- ---------------------------------------------------------------------------
alter table public.maison_membres
  add column notif_mots boolean not null default true,
  add column notif_agenda boolean not null default true,
  add column notif_matin boolean not null default true;

-- Un téléphone (ou navigateur) abonné aux notifications
create table public.maison_abonnements (
  endpoint  text primary key,
  membre    text not null references public.maison_membres(cle) on update cascade on delete cascade,
  p256dh    text not null,
  auth      text not null,
  appareil  text,
  cree_le   timestamptz not null default now()
);
create index maison_abonnements_membre_idx on public.maison_abonnements (membre);

-- ---------------------------------------------------------------------------
-- Menu de la semaine
-- ---------------------------------------------------------------------------
create table public.maison_menus (
  id          uuid primary key default gen_random_uuid(),
  le          date not null,
  moment      text not null default 'soir' check (moment in ('midi', 'soir')),
  titre       text not null check (length(btrim(titre)) > 0),
  emoji       text,
  ajoute_par  text references public.maison_membres(cle) on update cascade on delete set null,
  cree_le     timestamptz not null default now(),
  unique (le, moment)
);
create index maison_menus_ajoute_par_idx on public.maison_menus (ajoute_par);

-- ---------------------------------------------------------------------------
-- Papiers importants (fichiers dans le stockage privé « mervans », dossier maison/)
-- ---------------------------------------------------------------------------
create table public.maison_documents (
  id          uuid primary key default gen_random_uuid(),
  titre       text not null check (length(btrim(titre)) > 0),
  categorie   text not null default 'autre'
              check (categorie in ('facture', 'garantie', 'attestation', 'contrat', 'devis', 'notice', 'autre')),
  chemin      text not null,
  type_mime   text,
  taille      integer,
  lie_a       text check (lie_a in ('entretien', 'projet')),
  lie_id      uuid,
  date_doc    date,
  expire_le   date,
  notes       text,
  ajoute_par  text references public.maison_membres(cle) on update cascade on delete set null,
  cree_le     timestamptz not null default now()
);
create index maison_documents_lien_idx on public.maison_documents (lie_a, lie_id);
create index maison_documents_ajoute_par_idx on public.maison_documents (ajoute_par);

-- ---------------------------------------------------------------------------
-- Droits
-- ---------------------------------------------------------------------------
revoke all on public.maison_abonnements, public.maison_menus, public.maison_documents from anon, authenticated;
grant select, insert, update, delete on public.maison_abonnements, public.maison_menus, public.maison_documents to authenticated;

alter table public.maison_abonnements enable row level security;
alter table public.maison_menus       enable row level security;
alter table public.maison_documents   enable row level security;

create policy "Foyer uniquement" on public.maison_abonnements
  for all to authenticated using ((select maison_prive.est_membre())) with check ((select maison_prive.est_membre()));
create policy "Foyer uniquement" on public.maison_menus
  for all to authenticated using ((select maison_prive.est_membre())) with check ((select maison_prive.est_membre()));
create policy "Foyer uniquement" on public.maison_documents
  for all to authenticated using ((select maison_prive.est_membre())) with check ((select maison_prive.est_membre()));

alter publication supabase_realtime add table public.maison_menus, public.maison_documents;

-- ---------------------------------------------------------------------------
-- Stockage privé des fichiers (photos des petits mots et papiers)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('mervans', 'mervans', false, 15728640,
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'])
on conflict (id) do nothing;

create policy "Mervans maison : lecture" on storage.objects for select to authenticated
  using (bucket_id = 'mervans' and (storage.foldername(name))[1] = 'maison' and (select maison_prive.est_membre()));
create policy "Mervans maison : ajout" on storage.objects for insert to authenticated
  with check (bucket_id = 'mervans' and (storage.foldername(name))[1] = 'maison' and (select maison_prive.est_membre()));
create policy "Mervans maison : suppression" on storage.objects for delete to authenticated
  using (bucket_id = 'mervans' and (storage.foldername(name))[1] = 'maison' and (select maison_prive.est_membre()));
