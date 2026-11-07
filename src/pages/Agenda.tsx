import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { CarteEvenement, FormulaireEvenement, QuestionsEnAttente } from '../components/Agenda'
import { Sheet } from '../components/Sheet'
import { BoutonAjouter, Chargement, Choix, Erreur, TitrePage } from '../components/ui'
import { type Occurrence, TYPES, occurrences, typeInfo } from '../lib/agenda'
import { ajouterJours, aujourdhui, debutMois, depuisISO, finMois, jourComplet, majuscule, nomMois, versISO } from '../lib/dates'
import { table } from '../lib/supabase'
import type { Evenement } from '../lib/types'
import { useLive } from '../lib/useLive'

const JOURS_COURTS = ['lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.']

export function Agenda() {
  const [vue, setVue] = useState<'semaine' | 'mois'>('semaine')
  const [edition, setEdition] = useState<Partial<Evenement> | null>(null)
  const { lignes, setLignes, erreur, recharger } = useLive<Evenement>('evenements', () =>
    table('evenements').select('*').order('le').order('heure', { nullsFirst: true }),
  )

  const appliquer = (id: string, maj: Partial<Evenement> | null) =>
    setLignes((l) => (maj ? l?.map((e) => (e.id === id ? { ...e, ...maj } : e)) : l?.filter((e) => e.id !== id)) ?? l)

  // Les événements refusés n'apparaissent pas dans l'agenda (seulement dans « questions »)
  const visibles = useMemo(() => (lignes ?? []).filter((e) => e.statut !== 'refuse'), [lignes])

  return (
    <>
      <TitrePage>Agenda</TitrePage>

      <div className="px-5 pb-5">
        <Choix
          etiquette="Affichage"
          valeur={vue}
          changer={setVue}
          options={[
            { valeur: 'semaine', libelle: 'Semaine' },
            { valeur: 'mois', libelle: 'Mois' },
          ]}
        />
      </div>

      {erreur && <Erreur message={erreur} />}
      {!lignes && !erreur && <Chargement />}

      {lignes && (
        <div className="px-3 pb-2">
          <QuestionsEnAttente evenements={lignes} appliquer={appliquer} recharger={() => void recharger()} />
        </div>
      )}

      {lignes && vue === 'semaine' && <VueSemaine evenements={visibles} ouvrir={setEdition} ajouter={(le) => setEdition({ le })} />}
      {lignes && vue === 'mois' && <VueMois evenements={visibles} ouvrir={setEdition} ajouter={(le) => setEdition({ le })} />}

      {lignes && (
        <div className="mt-8 flex flex-wrap gap-x-4 gap-y-2 px-5 text-[0.85rem] text-encre-2" aria-label="Légende des couleurs">
          {TYPES.map((t) => (
            <span key={t.cle} className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-full" style={{ background: t.couleur }} aria-hidden="true" />
              {t.nom}
            </span>
          ))}
        </div>
      )}

      <BoutonAjouter libelle="Ajouter à l'agenda" onClick={() => setEdition({})} />

      <Sheet
        ouvert={edition !== null}
        fermer={() => setEdition(null)}
        titre={edition?.id ? 'Modifier' : 'Nouvel événement'}
      >
        {edition && (
          <FormulaireEvenement
            key={edition.id ?? `nouveau-${edition.le ?? ''}`}
            evenement={edition}
            fini={() => setEdition(null)}
            appliquer={appliquer}
            recharger={() => void recharger()}
          />
        )}
      </Sheet>
    </>
  )
}

function VueSemaine({
  evenements,
  ouvrir,
  ajouter,
}: {
  evenements: Evenement[]
  ouvrir: (e: Evenement) => void
  ajouter: (le: string) => void
}) {
  const jour = aujourdhui()
  const fin = ajouterJours(jour, 6)
  const semaine = occurrences(evenements, jour, fin)
  const ensuite = occurrences(evenements, ajouterJours(fin, 1), ajouterJours(jour, 120)).slice(0, 8)
  const jours = Array.from({ length: 7 }, (_, i) => ajouterJours(jour, i))

  return (
    <div className="px-3">
      <ol className="grid gap-1">
        {jours.map((j, i) => {
          const duJour = semaine.filter((o) => o.le === j)
          const d = depuisISO(j)
          return (
            <li key={j} className="flex gap-3 py-2">
              <button
                type="button"
                onClick={() => ajouter(j)}
                className={`flex w-14 shrink-0 flex-col items-center rounded-2xl py-2 ${i === 0 ? 'bg-encre text-fond' : 'bg-surface'}`}
                aria-label={`Ajouter un événement ${jourComplet(j)}`}
              >
                <span className={`text-[0.75rem] font-semibold ${i === 0 ? '' : 'text-encre-2'}`}>
                  {i === 0 ? 'auj.' : JOURS_COURTS[(d.getDay() + 6) % 7]}
                </span>
                <span className="nombre text-[1.45rem] leading-tight font-bold">{d.getDate()}</span>
              </button>
              <div className="grid min-w-0 flex-1 content-start gap-2">
                {duJour.length === 0 ? (
                  <p className="pt-3.5 text-[0.92rem] text-encre-3">{i === 0 ? "Rien de prévu aujourd'hui" : 'Rien de prévu'}</p>
                ) : (
                  duJour.map((o) => <CarteEvenement key={`${o.evenement.id}-${o.le}`} occurrence={o} ouvrir={ouvrir} />)
                )}
              </div>
            </li>
          )
        })}
      </ol>

      {ensuite.length > 0 && (
        <section className="mt-6">
          <h2 className="px-2 pb-2 text-[0.95rem] font-semibold text-encre-2">Ensuite</h2>
          <div className="grid gap-2">
            {ensuite.map((o) => (
              <CarteEvenement key={`${o.evenement.id}-${o.le}`} occurrence={o} ouvrir={ouvrir} avecDate />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function VueMois({
  evenements,
  ouvrir,
  ajouter,
}: {
  evenements: Evenement[]
  ouvrir: (e: Evenement) => void
  ajouter: (le: string) => void
}) {
  const auj = new Date()
  const [periode, setPeriode] = useState({ annee: auj.getFullYear(), mois: auj.getMonth() })
  const [choisi, setChoisi] = useState(aujourdhui())
  const debut = debutMois(periode.annee, periode.mois)
  const fin = finMois(periode.annee, periode.mois)
  const duMois = occurrences(evenements, debut, fin)
  const parJour = new Map<string, Occurrence[]>()
  for (const o of duMois) parJour.set(o.le, [...(parJour.get(o.le) ?? []), o])

  const decalage = (depuisISO(debut).getDay() + 6) % 7
  const nbJours = depuisISO(fin).getDate()
  const cases: (string | null)[] = [
    ...Array<null>(decalage).fill(null),
    ...Array.from({ length: nbJours }, (_, i) => versISO(new Date(periode.annee, periode.mois, i + 1))),
  ]
  while (cases.length % 7) cases.push(null)

  function changer(delta: number) {
    setPeriode(({ annee, mois }) => {
      const d = new Date(annee, mois + delta, 1)
      return { annee: d.getFullYear(), mois: d.getMonth() }
    })
  }

  const selection = occurrences(evenements, choisi, choisi)

  return (
    <div className="px-3">
      <div className="rounded-[1.4rem] bg-surface p-3">
        <div className="flex items-center gap-1 pb-2">
          <button type="button" className="grid size-10 place-items-center rounded-full" onClick={() => changer(-1)} aria-label="Mois précédent">
            <ChevronLeft size={22} />
          </button>
          <h2 className="flex-1 text-center text-[1.1rem] font-semibold">{majuscule(nomMois(periode.annee, periode.mois))}</h2>
          <button type="button" className="grid size-10 place-items-center rounded-full" onClick={() => changer(1)} aria-label="Mois suivant">
            <ChevronRight size={22} />
          </button>
        </div>
        <div className="grid grid-cols-7 text-center text-[0.72rem] font-semibold text-encre-3" aria-hidden="true">
          {JOURS_COURTS.map((j) => (
            <span key={j} className="py-1">
              {j}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-1" role="grid" aria-label={nomMois(periode.annee, periode.mois)}>
          {cases.map((j, i) =>
            j ? (
              <button
                key={j}
                type="button"
                onClick={() => setChoisi(j)}
                aria-pressed={choisi === j}
                aria-label={`${jourComplet(j)}${parJour.get(j) ? `, ${parJour.get(j)?.length} événement(s)` : ''}`}
                className={`flex h-12 flex-col items-center justify-start rounded-xl pt-1.5 ${
                  choisi === j ? 'bg-encre text-fond' : j === aujourdhui() ? 'bg-surface-2' : ''
                }`}
              >
                <span className="nombre text-[0.95rem] font-semibold">{depuisISO(j).getDate()}</span>
                <span className="mt-1 flex gap-0.5">
                  {(parJour.get(j) ?? []).slice(0, 3).map((o) => (
                    <span
                      key={o.evenement.id}
                      className="size-1.5 rounded-full"
                      style={{ background: choisi === j ? 'var(--fond)' : typeInfo(o.evenement.type).couleur }}
                    />
                  ))}
                </span>
              </button>
            ) : (
              <span key={`vide-${i}`} />
            ),
          )}
        </div>
      </div>

      <section className="mt-5">
        <div className="flex items-baseline px-2 pb-2">
          <h2 className="flex-1 text-[1.05rem] font-semibold">{majuscule(jourComplet(choisi))}</h2>
          <button type="button" className="text-[0.92rem] font-semibold underline underline-offset-4" onClick={() => ajouter(choisi)}>
            Ajouter
          </button>
        </div>
        <div className="grid gap-2">
          {selection.length === 0 ? (
            <p className="px-2 text-encre-3">Rien de prévu ce jour-là.</p>
          ) : (
            selection.map((o) => <CarteEvenement key={`${o.evenement.id}-${o.le}`} occurrence={o} ouvrir={ouvrir} />)
          )}
        </div>
      </section>
    </div>
  )
}
