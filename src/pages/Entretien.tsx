import { BellRing, CalendarCheck, CalendarClock, CheckCircle2, ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { type FormEvent, useMemo, useState } from 'react'
import { Sheet } from '../components/Sheet'
import { useToast } from '../components/Toast'
import { BoutonAjouter, Champ, Chargement, Erreur, Groupe } from '../components/ui'
import { CATEGORIES_ENTRETIEN, categorieEntretien, euros, lireMontant } from '../lib/categories'
import { aujourdhui, delai, jourAvecAnnee, majuscule } from '../lib/dates'
import { FREQUENCES, aPrevoirMaintenant, etatEntretien, nomDuMois, suivante, texteFrequence } from '../lib/entretien'
import { useFoyer } from '../lib/foyer'
import { table } from '../lib/supabase'
import type { EntretienFait, Entretien as TypeEntretien } from '../lib/types'
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
    return {
      maintenant: liste.filter(aPrevoirMaintenant),
      planifies: liste.filter((e) => e.prochaine && !aPrevoirMaintenant(e)),
      aPlanifier: liste.filter((e) => !e.prochaine),
    }
  }, [lignes])

  const fermer = () => setPanneau(null)
  const ouvrir = (item: TypeEntretien) => setPanneau({ mode: 'detail', item })

  return (
    <>
      <header className="px-5 pt-[calc(env(safe-area-inset-top)+1.75rem)] pb-5">
        <h1 className="titre-page">Entretien</h1>
        <p className="mt-2 text-encre-2">Ce qu'il faut faire régulièrement dans la maison. L'app vous prévient quand ça approche.</p>
      </header>

      {erreur && <Erreur message={erreur} />}
      {!lignes && !erreur && <Chargement />}

      {groupes.maintenant.length > 0 && (
        <section className="px-3">
          <h2 className="flex items-center gap-2 px-2 pb-3 text-[1.2rem] font-bold">
            <BellRing size={19} className="text-retard" /> À prévoir maintenant
          </h2>
          <div className="grid gap-3">
            {groupes.maintenant.map((e) => {
              const c = categorieEntretien(e.categorie)
              const enRetard = etatEntretien(e) === 'retard'
              return (
                <article key={e.id} className="rounded-[1.4rem] bg-surface p-4">
                  <button type="button" onClick={() => ouvrir(e)} className="flex w-full items-start gap-3 text-left">
                    <span className="grid size-11 shrink-0 place-items-center rounded-full bg-surface-2">
                      <c.icone size={21} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[1.1rem] leading-snug font-semibold">{e.titre}</span>
                      <span className={`mt-0.5 block text-[0.88rem] font-semibold ${enRetard ? 'text-retard' : 'text-encre-2'}`}>
                        {enRetard ? `En retard, prévu ${delai(e.prochaine ?? '')}` : majuscule(delai(e.prochaine ?? ''))}
                      </span>
                    </span>
                  </button>
                  {e.rappel && <p className="mt-3 rounded-2xl bg-fond px-3.5 py-3 text-[0.95rem] leading-snug">{e.rappel}</p>}
                  <button
                    type="button"
                    className="bouton bouton-principal mt-3 w-full !py-2.5"
                    onClick={() => setPanneau({ mode: 'fait', item: e })}
                  >
                    <CheckCircle2 size={18} /> C'est fait
                  </button>
                </article>
              )
            })}
          </div>
        </section>
      )}

      {groupes.planifies.length > 0 && (
        <ListeEntretien titre="Planifié" icone={<CalendarCheck size={18} />} items={groupes.planifies} ouvrir={ouvrir} />
      )}

      {groupes.aPlanifier.length > 0 && (
        <ListeEntretien
          titre="À démarrer"
          aide="Indiquez la dernière fois que c'est fait : l'app calculera la suivante."
          icone={<CalendarClock size={18} />}
          items={groupes.aPlanifier}
          ouvrir={ouvrir}
        />
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
            key={panneau.item.id ?? 'nouveau'}
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

function ListeEntretien({
  titre,
  aide,
  icone,
  items,
  ouvrir,
}: {
  titre: string
  aide?: string
  icone: ReactNode
  items: TypeEntretien[]
  ouvrir: (e: TypeEntretien) => void
}) {
  return (
    <section className="mt-8 px-3">
      <h2 className="flex items-center gap-2 px-2 text-[1.2rem] font-bold">
        {icone} {titre}
      </h2>
      {aide && <p className="px-2 pt-1 text-[0.9rem] text-encre-2">{aide}</p>}
      <ul className="liste mt-3 overflow-hidden rounded-[1.4rem] bg-surface">
        {items.map((e) => {
          const c = categorieEntretien(e.categorie)
          const mois = nomDuMois(e.mois_conseille)
          return (
            <li key={e.id}>
              <button type="button" onClick={() => ouvrir(e)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-2">
                  <c.icone size={19} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block leading-snug">{e.titre}</span>
                  <span className="mt-0.5 block text-[0.84rem] text-encre-2">
                    {e.prochaine
                      ? `${majuscule(jourAvecAnnee(e.prochaine))}, ${texteFrequence(e.frequence_mois)}`
                      : `${majuscule(texteFrequence(e.frequence_mois))}${mois ? `, idéalement en ${mois}` : ''}`}
                  </span>
                </span>
                <ChevronRight size={18} className="shrink-0 text-encre-3" />
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function Detail({ item, marquerFait, modifier }: { item: TypeEntretien; marquerFait: () => void; modifier: () => void }) {
  const { membre } = useFoyer()
  const { lignes: historique } = useLive<EntretienFait>(
    'entretien_historique',
    () => table('entretien_historique').select('*').eq('entretien_id', item.id).order('fait_le', { ascending: false }).limit(20),
    [item.id],
  )
  const c = categorieEntretien(item.categorie)
  const mois = nomDuMois(item.mois_conseille)

  return (
    <div>
      {item.rappel && (
        <div className="mb-5 rounded-2xl bg-fond px-4 py-3">
          <p className="text-[0.85rem] font-semibold text-encre-2">Quand ça approche</p>
          <p className="mt-1 leading-snug">{item.rappel}</p>
        </div>
      )}
      <dl className="mb-5 grid grid-cols-[auto_1fr] gap-x-5 gap-y-2.5">
        <dt className="text-encre-2">Prochaine fois</dt>
        <dd className="font-semibold">{item.prochaine ? `${majuscule(jourAvecAnnee(item.prochaine))} (${delai(item.prochaine)})` : 'Pas encore planifiée'}</dd>
        <dt className="text-encre-2">Fréquence</dt>
        <dd>{majuscule(texteFrequence(item.frequence_mois))}</dd>
        {mois && (
          <>
            <dt className="text-encre-2">Idéalement</dt>
            <dd>En {mois}</dd>
          </>
        )}
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
          <CheckCircle2 size={18} /> C'est fait
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
          className="champ min-h-16"
          placeholder="Ex. M. Martin, chauffagiste, 06…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </Champ>
      <p className="mb-4 rounded-2xl bg-fond px-4 py-3 text-[0.95rem]">
        {prochaine
          ? `Prochaine fois : ${jourAvecAnnee(prochaine)}. L'app vous le rappellera ${item.prevenir_jours >= 28 ? 'un mois' : `${item.prevenir_jours} jours`} avant.`
          : "Pas de prochaine fois : c'était à faire une seule fois."}
      </p>
      <button type="submit" className="bouton bouton-principal w-full">
        Enregistrer
      </button>
    </form>
  )
}

const DELAIS = [
  { jours: 7, libelle: '1 semaine' },
  { jours: 14, libelle: '2 semaines' },
  { jours: 30, libelle: '1 mois' },
  { jours: 60, libelle: '2 mois' },
]

const MOIS = ['Janv.', 'Févr.', 'Mars', 'Avril', 'Mai', 'Juin', 'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.']

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
  const [autreFrequence, setAutreFrequence] = useState(frequence && !FREQUENCES.some((f) => f.mois === frequence) ? String(frequence) : '')
  const [derniere, setDerniere] = useState(item.derniere ?? '')
  const [prochaine, setProchaine] = useState(item.prochaine ?? '')
  const [rappel, setRappel] = useState(item.rappel ?? '')
  const [prevenir, setPrevenir] = useState(item.prevenir_jours ?? 30)
  const [mois, setMois] = useState<number | null>(item.mois_conseille ?? null)
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
      rappel: rappel.trim() || null,
      prevenir_jours: prevenir,
      mois_conseille: mois,
      notes: notes.trim() || null,
    }
    fini()
    if (existant && item.id) {
      appliquer(item.id, donnees)
      const { error } = await table('entretien').update(donnees).eq('id', item.id)
      if (error) toast(`Non enregistré : ${error.message}`)
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
    else toast('Supprimé de la liste.')
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
          autoFocus={!existant}
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

      <Champ etiquette="Ce qu'il faudra faire quand ça approche">
        <textarea
          className="champ min-h-16"
          value={rappel}
          onChange={(e) => setRappel(e.target.value)}
          placeholder="Ex. Appeler le chauffagiste pour prendre rendez-vous"
        />
      </Champ>

      <Groupe etiquette="Me prévenir">
        <div className="flex flex-wrap gap-2">
          {DELAIS.map((d) => (
            <button key={d.jours} type="button" className="puce" aria-pressed={prevenir === d.jours} onClick={() => setPrevenir(d.jours)}>
              {d.libelle} avant
            </button>
          ))}
        </div>
      </Groupe>

      <Groupe etiquette="Mois idéal (facultatif)">
        <div className="flex flex-wrap gap-1.5">
          {MOIS.map((m, i) => (
            <button
              key={m}
              type="button"
              className="puce !px-2.5 !py-1.5 !text-[0.85rem]"
              aria-pressed={mois === i + 1}
              onClick={() => setMois(mois === i + 1 ? null : i + 1)}
            >
              {m}
            </button>
          ))}
        </div>
      </Groupe>

      <Champ etiquette="Dernière fois (facultatif)">
        <input type="date" className="champ" value={derniere} max={aujourdhui()} onChange={(e) => setDerniere(e.target.value)} />
      </Champ>

      <Champ
        etiquette="Prochaine fois"
        aide={prochaineCalculee ? `Calculée d'après la dernière fois : ${jourAvecAnnee(prochaineCalculee)}.` : undefined}
      >
        <input type="date" className="champ" value={prochaine} onChange={(e) => setProchaine(e.target.value)} />
      </Champ>

      <Champ etiquette="Notes">
        <textarea
          className="champ min-h-16"
          placeholder="Ex. contact du chauffagiste, numéro de contrat"
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
