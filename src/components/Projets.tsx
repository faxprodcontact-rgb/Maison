import { CheckCircle2, ChevronDown, ExternalLink, Hammer, Heart } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { euros, lireMontant } from '../lib/categories'
import { aujourdhui, jourAvecAnnee, majuscule } from '../lib/dates'
import { useFoyer } from '../lib/foyer'
import { table } from '../lib/supabase'
import type { Projet } from '../lib/types'
import { useLive } from '../lib/useLive'
import { PapiersLies } from './Papiers'
import { Sheet } from './Sheet'
import { useToast } from './Toast'
import { BoutonAjouter, Champ, Chargement, Choix, Erreur, Groupe } from './ui'

type Genre = Projet['genre']

const PRIORITES: Record<Genre, Record<Projet['priorite'], string>> = {
  travaux: { haute: 'Urgent', normale: 'Bientôt', basse: 'Un jour' },
  envie: { haute: 'Très envie', normale: 'Envie', basse: 'Peut-être' },
}

const TEXTES: Record<Genre, { total: string; vide: string; ajouter: string; fait: string; faits: string; titre: string; exemple: string }> = {
  travaux: {
    total: 'Travaux prévus, estimation',
    vide: 'Notez les travaux que vous voulez faire, avec un prix estimé : vous verrez le total à prévoir.',
    ajouter: 'Ajouter des travaux',
    fait: "C'est fait",
    faits: 'Réalisés',
    titre: 'Travaux',
    exemple: 'Ex. Repeindre la chambre d’amis',
  },
  envie: {
    total: 'Si on prend tout',
    vide: 'Gardez ici le lien d’un meuble ou d’un objet qui vous fait envie, avec son prix.',
    ajouter: 'Ajouter une envie',
    fait: 'Acheté',
    faits: 'Achetés',
    titre: 'Envie',
    exemple: 'Ex. Canapé d’angle',
  },
}

function domaine(lien: string | null): string | null {
  if (!lien) return null
  try {
    return new URL(lien).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}

function lienPropre(lien: string): string | null {
  const t = lien.trim()
  if (!t) return null
  return /^https?:\/\//i.test(t) ? t : `https://${t}`
}

/** Travaux à venir, ou envies d'achat avec leur lien */
export function OngletProjets({ genre }: { genre: Genre }) {
  const [edition, setEdition] = useState<Partial<Projet> | null>(null)
  const [voirFaits, setVoirFaits] = useState(false)
  const t = TEXTES[genre]
  const { lignes, setLignes, erreur, recharger } = useLive<Projet>(
    'projets',
    () => table('projets').select('*').eq('genre', genre).order('cree_le', { ascending: false }),
    [genre],
  )
  const appliquer = (id: string, maj: Partial<Projet> | null) =>
    setLignes((l) => (maj ? l?.map((p) => (p.id === id ? { ...p, ...maj } : p)) : l?.filter((p) => p.id !== id)) ?? l)

  const ordre = { haute: 0, normale: 1, basse: 2 }
  const aVenir = (lignes ?? []).filter((p) => !p.fait).sort((a, b) => ordre[a.priorite] - ordre[b.priorite])
  const faits = (lignes ?? []).filter((p) => p.fait)
  const total = aVenir.reduce((s, p) => s + Number(p.prix ?? 0), 0)
  const sansPrix = aVenir.filter((p) => p.prix === null).length

  return (
    <>
      {erreur && <Erreur message={erreur} />}
      {!lignes && !erreur && <Chargement />}

      {lignes && (
        <div className="mx-3 rounded-[1.6rem] bg-encre p-5 text-fond">
          <p className="flex items-center gap-2 font-semibold opacity-80">
            {genre === 'travaux' ? <Hammer size={17} /> : <Heart size={17} />} {t.total}
          </p>
          <p className="nombre mt-2 text-[2.8rem] leading-none font-bold tracking-tight" style={{ fontStretch: '85%' }}>
            {euros(total)}
          </p>
          <p className="mt-2 opacity-75">
            {aVenir.length === 0
              ? 'Rien pour le moment.'
              : `${aVenir.length} ${genre === 'travaux' ? 'chantier' : 'envie'}${aVenir.length > 1 ? 's' : ''}${
                  sansPrix > 0 ? `, dont ${sansPrix} sans prix` : ''
                }`}
          </p>
        </div>
      )}

      {lignes && aVenir.length === 0 && <p className="px-5 pt-5 text-encre-2">{t.vide}</p>}

      <div className="mt-4 grid gap-3 px-3">
        {aVenir.map((p) => (
          <CarteProjet key={p.id} projet={p} ouvrir={() => setEdition(p)} />
        ))}
      </div>

      {faits.length > 0 && (
        <div className="mt-6 px-3">
          <button
            type="button"
            onClick={() => setVoirFaits((v) => !v)}
            aria-expanded={voirFaits}
            className="flex items-center gap-1.5 px-2 font-semibold text-encre-2"
          >
            <ChevronDown size={18} className={voirFaits ? 'rotate-180' : ''} /> {t.faits} ({faits.length})
          </button>
          {voirFaits && (
            <div className="mt-3 grid gap-3 opacity-70">
              {faits.map((p) => (
                <CarteProjet key={p.id} projet={p} ouvrir={() => setEdition(p)} />
              ))}
            </div>
          )}
        </div>
      )}

      <BoutonAjouter libelle={t.ajouter} onClick={() => setEdition({ genre })} />

      <Sheet ouvert={edition !== null} fermer={() => setEdition(null)} titre={edition?.id ? 'Modifier' : t.ajouter}>
        {edition && (
          <FormulaireProjet
            key={edition.id ?? 'nouveau'}
            projet={{ ...edition, genre }}
            fini={() => setEdition(null)}
            appliquer={appliquer}
            recharger={() => void recharger()}
          />
        )}
      </Sheet>
    </>
  )
}

function CarteProjet({ projet: p, ouvrir }: { projet: Projet; ouvrir: () => void }) {
  const d = domaine(p.lien)
  const libellePriorite = PRIORITES[p.genre][p.priorite]
  return (
    <article className="rounded-[1.3rem] bg-surface">
      <button type="button" onClick={ouvrir} className="flex w-full items-start gap-3 px-4 pt-4 pb-3 text-left">
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            {!p.fait && (
              <span
                className={`rounded-full px-2.5 py-0.5 text-[0.75rem] font-bold ${
                  p.priorite === 'haute' ? 'bg-encre text-fond' : 'bg-surface-2 text-encre-2'
                }`}
              >
                {libellePriorite}
              </span>
            )}
            {p.fait && (
              <span className="inline-flex items-center gap-1 text-[0.8rem] font-semibold text-ok">
                <CheckCircle2 size={14} /> {p.genre === 'travaux' ? 'Fait' : 'Acheté'}
                {p.fait_le && ` le ${jourAvecAnnee(p.fait_le)}`}
              </span>
            )}
          </span>
          <span className="mt-1.5 block text-[1.1rem] leading-snug font-semibold">{p.titre}</span>
          {p.notes && <span className="mt-1 line-clamp-2 block text-[0.9rem] text-encre-2">{p.notes}</span>}
        </span>
        <span className="nombre shrink-0 pt-6 text-[1.15rem] font-bold">{p.prix !== null ? euros(Number(p.prix)) : '—'}</span>
      </button>
      {d && p.lien && (
        <a
          href={p.lien}
          target="_blank"
          rel="noopener noreferrer"
          className="mx-4 mb-4 inline-flex items-center gap-1.5 rounded-full bg-fond px-3 py-1.5 text-[0.85rem] font-semibold"
        >
          <ExternalLink size={14} /> Voir sur {d}
        </a>
      )}
    </article>
  )
}

function FormulaireProjet({
  projet,
  fini,
  appliquer,
  recharger,
}: {
  projet: Partial<Projet> & { genre: Genre }
  fini: () => void
  appliquer: (id: string, maj: Partial<Projet> | null) => void
  recharger: () => void
}) {
  const { moi } = useFoyer()
  const toast = useToast()
  const t = TEXTES[projet.genre]
  const existant = Boolean(projet.id)
  const [titre, setTitre] = useState(projet.titre ?? '')
  const [prix, setPrix] = useState(projet.prix !== null && projet.prix !== undefined ? String(projet.prix).replace('.', ',') : '')
  const [lien, setLien] = useState(projet.lien ?? '')
  const [priorite, setPriorite] = useState<Projet['priorite']>(projet.priorite ?? 'normale')
  const [notes, setNotes] = useState(projet.notes ?? '')

  async function enregistrer(e: FormEvent, marquerFait?: boolean) {
    e.preventDefault()
    if (!titre.trim()) return
    const donnees: Partial<Projet> = {
      genre: projet.genre,
      titre: majuscule(titre.trim()),
      prix: prix.trim() ? lireMontant(prix) : null,
      lien: lienPropre(lien),
      priorite,
      notes: notes.trim() || null,
    }
    if (marquerFait !== undefined) {
      donnees.fait = marquerFait
      donnees.fait_le = marquerFait ? aujourdhui() : null
    }
    fini()
    if (existant && projet.id) {
      appliquer(projet.id, donnees)
      const { error } = await table('projets').update(donnees).eq('id', projet.id)
      if (error) toast(`Non enregistré : ${error.message}`)
      else if (marquerFait) toast(projet.genre === 'travaux' ? 'Bravo, travaux terminés !' : 'Noté comme acheté.')
    } else {
      const { error } = await table('projets').insert({ ...donnees, cree_par: moi.cle })
      if (error) toast(`Non enregistré : ${error.message}`)
    }
    recharger()
  }

  async function supprimer() {
    if (!projet.id) return
    fini()
    appliquer(projet.id, null)
    const { error } = await table('projets').delete().eq('id', projet.id)
    if (error) toast(`Suppression impossible : ${error.message}`)
    recharger()
  }

  return (
    <>
    <form onSubmit={(e) => void enregistrer(e)}>
      <Champ etiquette={t.titre}>
        <input className="champ" value={titre} onChange={(e) => setTitre(e.target.value)} placeholder={t.exemple} required autoFocus={!existant} />
      </Champ>
      <Champ etiquette={projet.genre === 'travaux' ? 'Prix estimé' : 'Prix'}>
        <span className="flex items-baseline gap-2 border-b-2 border-trait focus-within:border-encre">
          <input
            className="nombre w-full bg-transparent py-1 text-[2rem] font-bold outline-none placeholder:text-encre-3"
            inputMode="decimal"
            placeholder="0"
            value={prix}
            onChange={(e) => setPrix(e.target.value.replace(/[^\d.,\s]/g, ''))}
          />
          <span className="text-[1.5rem] font-semibold text-encre-2">€</span>
        </span>
      </Champ>
      <Champ etiquette={projet.genre === 'travaux' ? 'Lien (devis, idée, tuto…)' : 'Lien vers l’article'}>
        <input className="champ" type="text" inputMode="url" autoCapitalize="none" autoCorrect="off" value={lien} onChange={(e) => setLien(e.target.value)} placeholder="https://…" />
      </Champ>
      <Groupe etiquette={projet.genre === 'travaux' ? 'Quand ?' : 'Envie'}>
        <Choix
          etiquette="Priorité"
          valeur={priorite}
          changer={setPriorite}
          options={(['haute', 'normale', 'basse'] as const).map((p) => ({ valeur: p, libelle: PRIORITES[projet.genre][p] }))}
        />
      </Groupe>
      <Champ etiquette="Notes">
        <textarea className="champ min-h-16" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Couleur, dimensions, artisan…" />
      </Champ>

      {existant && (
        <button
          type="button"
          className="bouton bouton-secondaire mb-3 w-full"
          onClick={(e) => void enregistrer(e as unknown as FormEvent, !projet.fait)}
        >
          <CheckCircle2 size={18} /> {projet.fait ? `Ce n'est pas encore ${projet.genre === 'travaux' ? 'fait' : 'acheté'}` : t.fait}
        </button>
      )}
      <div className="flex gap-3">
        {existant && (
          <button type="button" className="bouton bouton-danger" onClick={() => void supprimer()}>
            Supprimer
          </button>
        )}
        <button type="submit" className="bouton bouton-principal flex-1">
          {existant ? 'Enregistrer' : 'Ajouter'}
        </button>
      </div>
    </form>
    {existant && projet.id && projet.genre === 'travaux' && (
      <PapiersLies lien={{ lie_a: 'projet', lie_id: projet.id, nom: projet.titre ?? '' }} />
    )}
    </>
  )
}
