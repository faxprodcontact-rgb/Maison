import { ChevronRight, Plus } from 'lucide-react'
import { type FormEvent, useMemo, useState } from 'react'
import { ajouterJours, aujourdhui, depuisISO, jourComplet, majuscule } from '../lib/dates'
import { useFoyer } from '../lib/foyer'
import { normaliser } from '../lib/rayons'
import { REPAS, type Repas } from '../lib/repas'
import { table } from '../lib/supabase'
import type { Menu } from '../lib/types'
import { useLive } from '../lib/useLive'
import { Sheet } from './Sheet'
import { useToast } from './Toast'
import { Champ, Choix, Groupe } from './ui'

const JOURS_COURTS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.']

function nomJour(le: string): string {
  const ecart = Math.round((depuisISO(le).getTime() - depuisISO(aujourdhui()).getTime()) / 86_400_000)
  if (ecart === 0) return "Aujourd'hui"
  if (ecart === 1) return 'Demain'
  return majuscule(jourComplet(le).split(' ').slice(0, 2).join(' '))
}

export type OuvrirMenu = (choix: { le?: string; moment?: 'midi' | 'soir'; repas?: Repas; existant?: Menu }) => void

/** Les repas prévus sur les 7 prochains jours */
export function MenuSemaine({ ouvrir }: { ouvrir: OuvrirMenu }) {
  const jour = aujourdhui()
  const fin = ajouterJours(jour, 6)
  const jours = Array.from({ length: 7 }, (_, i) => ajouterJours(jour, i))
  const { lignes } = useLive<Menu>('menus', () => table('menus').select('*').gte('le', jour).lte('le', fin).order('le'), [jour])

  return (
    <section aria-labelledby="titre-menu" className="mt-10">
      <h2 id="titre-menu" className="px-5 text-[1.35rem] font-bold tracking-tight">
        Menu de la semaine
      </h2>
      <p className="px-5 pb-3 text-[0.92rem] text-encre-2">Touchez un jour pour prévoir le repas.</p>
      <ul className="liste mx-3 overflow-hidden rounded-[1.4rem] bg-surface">
        {jours.map((j) => {
          const duJour = (lignes ?? []).filter((m) => m.le === j).sort((a, b) => (a.moment === 'midi' ? -1 : 1) - (b.moment === 'midi' ? -1 : 1))
          return (
            <li key={j}>
              <button
                type="button"
                onClick={() => ouvrir(duJour.length === 1 ? { le: j, existant: duJour[0] } : { le: j })}
                className="flex w-full items-center gap-3 px-4 py-3 text-left"
              >
                <span className="w-24 shrink-0">
                  <span className="block text-[0.95rem] font-semibold">{nomJour(j)}</span>
                  <span className="block text-[0.78rem] text-encre-3">{JOURS_COURTS[depuisISO(j).getDay()]} {depuisISO(j).getDate()}</span>
                </span>
                <span className="min-w-0 flex-1">
                  {duJour.length === 0 ? (
                    <span className="inline-flex items-center gap-1.5 text-encre-3">
                      <Plus size={15} /> Prévoir un repas
                    </span>
                  ) : (
                    duJour.map((m) => (
                      <span key={m.id} className="block truncate">
                        {duJour.length > 1 && <span className="text-[0.82rem] text-encre-3">{m.moment === 'midi' ? 'Midi ' : 'Soir '}</span>}
                        {m.emoji && <span aria-hidden="true">{m.emoji} </span>}
                        <span className="font-semibold">{m.titre}</span>
                      </span>
                    ))
                  )}
                </span>
                <ChevronRight size={17} className="shrink-0 text-encre-3" />
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/** Fiche pour prévoir (ou changer) un repas */
export function FicheMenu({
  choix,
  fermer,
  ajouterIngredients,
}: {
  choix: { le?: string; moment?: 'midi' | 'soir'; repas?: Repas; existant?: Menu } | null
  fermer: () => void
  ajouterIngredients: (r: Repas) => void
}) {
  return (
    <Sheet ouvert={choix !== null} fermer={fermer} titre={choix?.existant ? 'Repas prévu' : 'Prévoir un repas'}>
      {choix && (
        <FormulaireMenu
          key={`${choix.le ?? ''}-${choix.existant?.id ?? ''}-${choix.repas?.nom ?? ''}`}
          choix={choix}
          fini={fermer}
          ajouterIngredients={ajouterIngredients}
        />
      )}
    </Sheet>
  )
}

function FormulaireMenu({
  choix,
  fini,
  ajouterIngredients,
}: {
  choix: { le?: string; moment?: 'midi' | 'soir'; repas?: Repas; existant?: Menu }
  fini: () => void
  ajouterIngredients: (r: Repas) => void
}) {
  const { moi } = useFoyer()
  const toast = useToast()
  const jours = Array.from({ length: 7 }, (_, i) => ajouterJours(aujourdhui(), i))
  const [le, setLe] = useState(choix.existant?.le ?? choix.le ?? aujourdhui())
  const [moment, setMoment] = useState<'midi' | 'soir'>(choix.existant?.moment ?? choix.moment ?? 'soir')
  const [titre, setTitre] = useState(choix.existant?.titre ?? choix.repas?.nom ?? '')
  const [repas, setRepas] = useState<Repas | undefined>(choix.repas ?? REPAS.find((r) => r.nom === choix.existant?.titre))
  const [avecIngredients, setAvecIngredients] = useState(!choix.existant)

  const suggestions = useMemo(() => {
    const q = normaliser(titre)
    if (q.length < 2 || repas?.nom === titre) return []
    return REPAS.filter((r) => normaliser(r.nom).includes(q)).slice(0, 5)
  }, [titre, repas])

  async function enregistrer(e: FormEvent) {
    e.preventDefault()
    const propre = majuscule(titre.trim())
    if (!propre) return
    const connu = repas?.nom === propre ? repas : REPAS.find((r) => normaliser(r.nom) === normaliser(propre))
    fini()
    if (choix.existant && (choix.existant.le !== le || choix.existant.moment !== moment)) {
      await table('menus').delete().eq('id', choix.existant.id)
    }
    const { error } = await table('menus').upsert(
      { le, moment, titre: propre, emoji: connu?.emoji ?? '🍽️', ajoute_par: moi.cle },
      { onConflict: 'le,moment' },
    )
    if (error) return toast(`Non enregistré : ${error.message}`)
    if (connu && avecIngredients) ajouterIngredients(connu)
    else toast(`${propre} : prévu ${nomJour(le).toLowerCase()} ${moment === 'midi' ? 'midi' : 'soir'}.`)
  }

  async function retirer() {
    if (!choix.existant) return
    fini()
    const { error } = await table('menus').delete().eq('id', choix.existant.id)
    if (error) toast(`Suppression impossible : ${error.message}`)
  }

  return (
    <form onSubmit={enregistrer}>
      <Groupe etiquette="Quel jour ?">
        <div className="flex flex-wrap gap-2">
          {jours.map((j) => (
            <button key={j} type="button" className="puce" aria-pressed={le === j} onClick={() => setLe(j)}>
              {nomJour(j)}
            </button>
          ))}
        </div>
      </Groupe>
      <Groupe etiquette="Repas">
        <Choix
          etiquette="Repas"
          valeur={moment}
          changer={setMoment}
          options={[
            { valeur: 'midi', libelle: 'Midi' },
            { valeur: 'soir', libelle: 'Soir' },
          ]}
        />
      </Groupe>
      <Champ etiquette="Qu'est-ce qu'on mange ?">
        <input
          className="champ"
          value={titre}
          onChange={(e) => {
            setTitre(e.target.value)
            setRepas(undefined)
          }}
          placeholder="Ex. Lasagnes, restes, pizza…"
          required
          autoComplete="off"
        />
      </Champ>
      {suggestions.length > 0 && (
        <div className="-mt-3 mb-5 flex flex-wrap gap-2">
          {suggestions.map((r) => (
            <button
              key={r.nom}
              type="button"
              className="puce"
              onClick={() => {
                setTitre(r.nom)
                setRepas(r)
                setAvecIngredients(true)
              }}
            >
              <span aria-hidden="true">{r.emoji}</span> {r.nom}
            </button>
          ))}
        </div>
      )}
      {repas && repas.nom === titre && (
        <label className="mb-5 flex items-start gap-3 rounded-2xl bg-fond px-4 py-3">
          <input
            type="checkbox"
            className="mt-1 size-5 accent-[var(--encre)]"
            checked={avecIngredients}
            onChange={(e) => setAvecIngredients(e.target.checked)}
          />
          <span>
            <span className="block font-semibold">Ajouter les ingrédients aux courses</span>
            <span className="block text-[0.88rem] text-encre-2">{repas.ingredients.join(', ')}</span>
          </span>
        </label>
      )}
      <div className="flex gap-3">
        {choix.existant && (
          <button type="button" className="bouton bouton-danger" onClick={() => void retirer()}>
            Retirer
          </button>
        )}
        <button type="submit" className="bouton bouton-principal flex-1">
          {choix.existant ? 'Enregistrer' : 'Prévoir ce repas'}
        </button>
      </div>
    </form>
  )
}
