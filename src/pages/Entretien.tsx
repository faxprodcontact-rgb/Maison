import { CalendarClock, Plus } from 'lucide-react'
import { type FormEvent, useMemo, useState } from 'react'
import { Sheet } from '../components/Sheet'
import { useToast } from '../components/Toast'
import { BoutonAjouter, Champ, Chargement, Erreur, Groupe, Liste, Section, TitrePage, Vide } from '../components/ui'
import { CATEGORIES_ENTRETIEN, categorieEntretien, euros, lireMontant } from '../lib/categories'
import { aujourdhui, delai, jourAvecAnnee, majuscule } from '../lib/dates'
import { FREQUENCES, IDEES_ENTRETIEN, etatEntretien, suivante, texteFrequence } from '../lib/entretien'
import { useFoyer } from '../lib/foyer'
import { table } from '../lib/supabase'
import type { Entretien as TypeEntretien, EntretienFait } from '../lib/types'
import { useLive } from '../lib/useLive'

type Panneau =
  | { mode: 'detail'; item: TypeEntretien }
  | { mode: 'fait'; item: TypeEntretien }
  | { mode: 'formulaire'; item: Partial<TypeEntretien> }
  | null

export function Entretien() {
  const [panneau, setPanneau] = useState<Panneau>(null)
  const { lignes, setLignes, erreur, recharger } = useLive<TypeEntretien>('entretien', () =>
    table('entretien').select('*').order('prochaine', { ascending: true, nullsFirst: false }).order('titre'),
  )

  const appliquer = (id: string, maj: Partial<TypeEntretien> | null) =>
    setLignes((l) => (maj ? l?.map((e) => (e.id === id ? { ...e, ...maj } : e)) : l?.filter((e) => e.id !== id)) ?? l)

  const groupes = useMemo(() => {
    const liste = lignes ?? []
    return [
      { titre: 'En retard', ton: 'retard' as const, items: liste.filter((e) => etatEntretien(e) === 'retard') },
      { titre: 'Dans les 30 jours', ton: 'bientot' as const, items: liste.filter((e) => etatEntretien(e) === 'bientot') },
      { titre: 'Plus tard', ton: undefined, items: liste.filter((e) => etatEntretien(e) === 'plus-tard') },
      { titre: 'Sans échéance', ton: undefined, items: liste.filter((e) => etatEntretien(e) === 'sans-date') },
    ].filter((g) => g.items.length > 0)
  }, [lignes])

  const existants = new Set((lignes ?? []).map((e) => e.titre.toLowerCase()))
  const idees = IDEES_ENTRETIEN.filter((i) => !existants.has(i.titre.toLowerCase()))
  const fermer = () => setPanneau(null)

  return (
    <>
      <TitrePage>Entretien</TitrePage>

      {erreur && <Erreur message={erreur} />}
      {!lignes && !erreur && <Chargement />}

      {lignes && lignes.length === 0 && (
        <Vide titre="Rien à suivre pour l'instant.">
          Notez ici ce qui revient : chaudière, ramonage, contrôle technique, assurances, garanties… L'app vous
          prévient quand l'échéance approche.
        </Vide>
      )}

      {groupes.map((g) => (
        <Section key={g.titre} titre={g.titre} ton={g.ton} apres={<span className="nombre text-encre-3">{g.items.length}</span>}>
          <Liste>
            {g.items.map((e) => (
              <LigneEntretien key={e.id} item={e} ouvrir={() => setPanneau({ mode: 'detail', item: e })} />
            ))}
          </Liste>
        </Section>
      ))}

      {lignes && idees.length > 0 && (
        <div className="mt-8 px-5">
          <p className="mb-2 font-semibold text-encre-2">{lignes.length === 0 ? 'Pour commencer' : 'Idées à ajouter'}</p>
          <div className="flex flex-wrap gap-2">
            {idees.slice(0, lignes.length === 0 ? 11 : 5).map((idee) => (
              <button
                key={idee.titre}
                type="button"
                className="puce"
                onClick={() => setPanneau({ mode: 'formulaire', item: { ...idee } })}
              >
                <Plus size={15} className="text-encre-3" />
                {idee.titre}
              </button>
            ))}
          </div>
        </div>
      )}

      <BoutonAjouter libelle="Ajouter un entretien" onClick={() => setPanneau({ mode: 'formulaire', item: {} })} />

      <Sheet
        ouvert={panneau !== null}
        fermer={fermer}
        titre={
          panneau?.mode === 'fait'
            ? "C'est fait"
            : panneau?.mode === 'formulaire'
              ? panneau.item.id
                ? 'Modifier'
                : 'Nouvel entretien'
              : (panneau?.item.titre ?? '')
        }
      >
        {panneau?.mode === 'detail' && (
          <Detail
            item={panneau.item}
            marquerFait={() => setPanneau({ mode: 'fait', item: panneau.item })}
            modifier={() => setPanneau({ mode: 'formulaire', item: panneau.item })}
          />
        )}
        {panneau?.mode === 'fait' && (
          <FormulaireFait item={panneau.item} fini={fermer} appliquer={appliquer} recharger={() => void recharger()} />
        )}
        {panneau?.mode === 'formulaire' && (
          <FormulaireEntretien
            key={panneau.item.id ?? panneau.item.titre ?? 'nouveau'}
            item={panneau.item}
            fini={fermer}
            appliquer={appliquer}
            recharger={() => void recharger()}
          />
        )}
      </Sheet>
    </>
  )
}

export function TexteEcheance({ item }: { item: Pick<TypeEntretien, 'prochaine'> }) {
  const etat = etatEntretien(item)
  if (!item.prochaine) return <span className="text-encre-3">Pas d'échéance</span>
  if (etat === 'retard') return <span className="font-semibold text-retard">En retard, prévu {delai(item.prochaine)}</span>
  if (etat === 'bientot')
    return (
      <span className="inline-flex items-center gap-1 font-semibold text-bientot">
        <CalendarClock size={14} />
        {majuscule(delai(item.prochaine))}
      </span>
    )
  return <span>Le {jourAvecAnnee(item.prochaine)}</span>
}

function LigneEntretien({ item, ouvrir }: { item: TypeEntretien; ouvrir: () => void }) {
  const c = categorieEntretien(item.categorie)
  return (
    <li>
      <button type="button" className="flex w-full items-center gap-3.5 px-4 py-3 text-left" onClick={ouvrir}>
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-2">
          <c.icone size={19} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[1.05rem] leading-snug">{item.titre}</span>
          <span className="mt-0.5 flex flex-wrap gap-x-2 text-[0.85rem] text-encre-2">
            <TexteEcheance item={item} />
            {item.frequence_mois && <span className="text-encre-3">{texteFrequence(item.frequence_mois)}</span>}
          </span>
        </span>
      </button>
    </li>
  )
}

function Detail({ item, marquerFait, modifier }: { item: TypeEntretien; marquerFait: () => void; modifier: () => void }) {
  const { membre } = useFoyer()
  const { lignes: historique } = useLive<EntretienFait>(
    'entretien_historique',
    () =>
      table('entretien_historique')
        .select('*')
        .eq('entretien_id', item.id)
        .order('fait_le', { ascending: false })
        .limit(20),
    [item.id],
  )
  const c = categorieEntretien(item.categorie)

  return (
    <div>
      <dl className="mb-5 grid grid-cols-[auto_1fr] gap-x-5 gap-y-2.5">
        <dt className="text-encre-2">Échéance</dt>
        <dd>
          <TexteEcheance item={item} />
          {item.prochaine && etatEntretien(item) !== 'plus-tard' && (
            <span className="block text-[0.9rem] text-encre-3">{jourAvecAnnee(item.prochaine)}</span>
          )}
        </dd>
        <dt className="text-encre-2">Fréquence</dt>
        <dd>{majuscule(texteFrequence(item.frequence_mois))}</dd>
        <dt className="text-encre-2">Dernière fois</dt>
        <dd>{item.derniere ? jourAvecAnnee(item.derniere) : 'Pas encore noté'}</dd>
        <dt className="text-encre-2">Catégorie</dt>
        <dd className="flex items-center gap-2">
          <c.icone size={16} /> {c.nom}
        </dd>
      </dl>
      {item.notes && <p className="mb-5 rounded-xl bg-fond px-4 py-3 whitespace-pre-line">{item.notes}</p>}

      <div className="flex gap-3">
        <button type="button" className="bouton bouton-secondaire" onClick={modifier}>
          Modifier
        </button>
        <button type="button" className="bouton bouton-principal flex-1" onClick={marquerFait}>
          C'est fait
        </button>
      </div>

      {historique && historique.length > 0 && (
        <div className="mt-7">
          <h3 className="mb-2 font-semibold text-encre-2">Historique</h3>
          <ul className="liste">
            {historique.map((h) => (
              <li key={h.id} className="py-2.5">
                <span className="flex gap-3">
                  <span className="flex-1">
                    {jourAvecAnnee(h.fait_le)}
                    {h.fait_par && <span className="text-encre-3"> par {membre(h.fait_par)?.prenom}</span>}
                  </span>
                  {h.cout !== null && <span className="nombre font-semibold">{euros(Number(h.cout))}</span>}
                </span>
                {h.notes && <span className="block text-[0.9rem] text-encre-2">{h.notes}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function FormulaireFait({
  item,
  fini,
  appliquer,
  recharger,
}: {
  item: TypeEntretien
  fini: () => void
  appliquer: (id: string, maj: Partial<TypeEntretien>) => void
  recharger: () => void
}) {
  const { moi } = useFoyer()
  const toast = useToast()
  const [le, setLe] = useState(aujourdhui())
  const [cout, setCout] = useState('')
  const [notes, setNotes] = useState('')
  const prochaine = suivante(le, item.frequence_mois)

  async function enregistrer(e: FormEvent) {
    e.preventDefault()
    const maj = { derniere: le, prochaine }
    appliquer(item.id, maj)
    fini()
    const [a, b] = await Promise.all([
      table('entretien').update(maj).eq('id', item.id),
      table('entretien_historique').insert({
        entretien_id: item.id,
        fait_le: le,
        cout: cout ? lireMontant(cout) : null,
        notes: notes.trim() || null,
        fait_par: moi.cle,
      }),
    ])
    const erreur = a.error ?? b.error
    if (erreur) toast(`Non enregistré : ${erreur.message}`)
    else toast(prochaine ? `C'est noté. Prochaine fois : ${jourAvecAnnee(prochaine)}.` : "C'est noté.")
    recharger()
  }

  return (
    <form onSubmit={enregistrer}>
      <p className="mb-5 text-encre-2">{item.titre}</p>
      <Champ etiquette="Fait le">
        <input type="date" className="champ" value={le} max={aujourdhui()} onChange={(e) => setLe(e.target.value || aujourdhui())} />
      </Champ>
      <Champ etiquette="Coût (facultatif)">
        <input className="champ nombre" inputMode="decimal" placeholder="Ex. 120" value={cout} onChange={(e) => setCout(e.target.value)} />
      </Champ>
      <Champ etiquette="Notes (facultatif)">
        <textarea
          className="champ min-h-20"
          placeholder="Ex. Technicien M. Martin, pièce changée"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </Champ>
      <p className="mb-4 text-[0.9rem] text-encre-2">
        {prochaine ? `Prochaine échéance : ${jourAvecAnnee(prochaine)}.` : "Pas de prochaine échéance : c'était une seule fois."}
      </p>
      <button type="submit" className="bouton bouton-principal w-full">
        Enregistrer
      </button>
    </form>
  )
}

function FormulaireEntretien({
  item,
  fini,
  appliquer,
  recharger,
}: {
  item: Partial<TypeEntretien>
  fini: () => void
  appliquer: (id: string, maj: Partial<TypeEntretien> | null) => void
  recharger: () => void
}) {
  const toast = useToast()
  const existant = Boolean(item.id)
  const [titre, setTitre] = useState(item.titre ?? '')
  const [categorie, setCategorie] = useState(item.categorie ?? 'maison')
  const [frequence, setFrequence] = useState<number | null>(item.id ? (item.frequence_mois ?? null) : (item.frequence_mois ?? 12))
  const [autreFrequence, setAutreFrequence] = useState(
    frequence && !FREQUENCES.some((f) => f.mois === frequence) ? String(frequence) : '',
  )
  const [derniere, setDerniere] = useState(item.derniere ?? '')
  const [prochaine, setProchaine] = useState(item.prochaine ?? '')
  const [notes, setNotes] = useState(item.notes ?? '')

  const frequenceFinale = autreFrequence ? Math.min(240, Math.max(1, Number.parseInt(autreFrequence, 10) || 1)) : frequence
  const prochaineCalculee = !prochaine && derniere ? suivante(derniere, frequenceFinale) : null

  async function enregistrer(e: FormEvent) {
    e.preventDefault()
    if (!titre.trim()) return
    const donnees = {
      titre: majuscule(titre.trim()),
      categorie,
      frequence_mois: frequenceFinale,
      derniere: derniere || null,
      prochaine: prochaine || prochaineCalculee || null,
      notes: notes.trim() || null,
    }
    fini()
    if (existant && item.id) {
      appliquer(item.id, donnees)
      const { error } = await table('entretien').update(donnees).eq('id', item.id)
      if (error) toast(`Modification non enregistrée : ${error.message}`)
    } else {
      const { error } = await table('entretien').insert(donnees)
      if (error) toast(`Non enregistré : ${error.message}`)
      else toast(`${donnees.titre} ajouté.`)
    }
    recharger()
  }

  async function supprimer() {
    if (!item.id) return
    fini()
    appliquer(item.id, null)
    const { error } = await table('entretien').delete().eq('id', item.id)
    if (error) toast(`Suppression impossible : ${error.message}`)
    else toast('Supprimé.')
    recharger()
  }

  return (
    <form onSubmit={enregistrer}>
      <Champ etiquette="Quoi ?">
        <input
          className="champ"
          value={titre}
          onChange={(e) => setTitre(e.target.value)}
          placeholder="Ex. Entretien de la chaudière"
          required
          autoFocus={!existant && !item.titre}
        />
      </Champ>

      <Groupe etiquette="Catégorie">
        <div className="flex flex-wrap gap-2">
          {CATEGORIES_ENTRETIEN.map((c) => (
            <button key={c.cle} type="button" className="puce" aria-pressed={categorie === c.cle} onClick={() => setCategorie(c.cle)}>
              <c.icone size={16} />
              {c.nom}
            </button>
          ))}
        </div>
      </Groupe>

      <Groupe etiquette="À refaire tous les">
        <div className="flex flex-wrap gap-2">
          {FREQUENCES.map((f) => (
            <button
              key={f.libelle}
              type="button"
              className="puce"
              aria-pressed={!autreFrequence && frequence === f.mois}
              onClick={() => {
                setAutreFrequence('')
                setFrequence(f.mois)
              }}
            >
              {f.libelle}
            </button>
          ))}
        </div>
        <label className="mt-3 flex items-center gap-3 text-encre-2">
          Autre :
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={240}
            className="champ nombre !w-20 text-center"
            value={autreFrequence}
            onChange={(e) => setAutreFrequence(e.target.value)}
            aria-label="Nombre de mois"
          />
          mois
        </label>
      </Groupe>

      <Champ etiquette="Dernière fois (facultatif)">
        <input type="date" className="champ" value={derniere} max={aujourdhui()} onChange={(e) => setDerniere(e.target.value)} />
      </Champ>

      <Champ
        etiquette="Prochaine échéance"
        aide={prochaineCalculee ? `Calculée d'après la dernière fois : ${jourAvecAnnee(prochaineCalculee)}.` : undefined}
      >
        <input type="date" className="champ" value={prochaine} onChange={(e) => setProchaine(e.target.value)} />
      </Champ>

      <Champ etiquette="Notes">
        <textarea
          className="champ min-h-20"
          placeholder="Ex. contact du chauffagiste, numéro de contrat, date de fin de garantie"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </Champ>

      <div className="mt-2 flex gap-3">
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
  )
}
