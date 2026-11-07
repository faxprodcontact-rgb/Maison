-- Maison : rejoindre le foyer depuis l'app
--
-- N'importe qui peut créer un compte sur le projet (il est partagé avec d'autres apps),
-- mais seul quelqu'un qui connaît le code du foyer peut prendre une des places libres
-- (Simon ou Romane). Une place prise ne peut plus être reprise.
--
-- Le code du foyer n'est PAS dans ce fichier : il est enregistré directement dans la base,
-- haché, avec :
--   insert into maison_prive.reglages (cle, valeur)
--   values ('code_foyer', extensions.crypt('CODESANSTIRET', extensions.gen_salt('bf')))
--   on conflict (cle) do update set valeur = excluded.valeur;

create table maison_prive.reglages (
  cle     text primary key,
  valeur  text not null
);
-- Aucun droit donné : seules les fonctions ci-dessous (security definer) peuvent la lire.
revoke all on maison_prive.reglages from public, anon, authenticated;

create or replace function maison_prive.code_valide(p_code text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from maison_prive.reglages r
    where r.cle = 'code_foyer'
      and r.valeur = extensions.crypt(upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g')), r.valeur)
  );
$$;
revoke all on function maison_prive.code_valide(text) from public, anon, authenticated;

-- Les places encore libres, seulement avec le bon code
create or replace function public.maison_places_libres(p_code text)
returns table (cle text, prenom text, couleur text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Connectez-vous pour rejoindre le foyer.';
  end if;
  if not maison_prive.code_valide(p_code) then
    raise exception 'Ce code du foyer est incorrect.';
  end if;
  return query
    select m.cle, m.prenom, m.couleur from public.maison_membres m
    where m.user_id is null
    order by m.cle desc;
end;
$$;

-- Prendre une place libre
create or replace function public.maison_rejoindre(p_code text, p_cle text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  moi uuid := (select auth.uid());
begin
  if moi is null then
    raise exception 'Connectez-vous pour rejoindre le foyer.';
  end if;
  if not maison_prive.code_valide(p_code) then
    raise exception 'Ce code du foyer est incorrect.';
  end if;
  if exists (select 1 from public.maison_membres where user_id = moi) then
    raise exception 'Ce compte fait déjà partie du foyer.';
  end if;
  update public.maison_membres set user_id = moi where cle = p_cle and user_id is null;
  if not found then
    raise exception 'Cette place est déjà prise.';
  end if;
end;
$$;

revoke all on function public.maison_places_libres(text) from public, anon;
revoke all on function public.maison_rejoindre(text, text) from public, anon;
grant execute on function public.maison_places_libres(text) to authenticated;
grant execute on function public.maison_rejoindre(text, text) to authenticated;
