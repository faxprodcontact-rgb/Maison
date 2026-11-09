import { Bell, Plus } from 'lucide-react'
import { type FormEvent, useMemo, useState } from 'react'
import { ajouterJours, aujourdhui, depuisISO, jourComplet, majuscule } from '../lib/dates'
import { useFoyer } from '../lib/foyer'
import { table } from '../lib/supabase'
import type { Tache } from '../lib/types'
import { LigneTache, heureCourte } from './Taches'
import { useToast } from './Toast'
import { Liste, Pastille, Section } from './ui'

const HEURES = [
  { valeur: '', libelle: 'Résumé de 8 h' },
  { valeur: '12:00', libelle: '12 h' },
  { valeur: '17:00', libelle: '17 h' },
  { valeur: '19:00', libelle: '19 h' },
]

const JOURS_COURTS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.']

function nomJour(le: string, i: number): string {
  if (i === 0) return "Aujourd'hui"
  if (i === 1) return 'Demain'
  const d = depuisISO(le)
  return `${JOURS_COURTS[d.getDay()]} ${d.getDate()}`
}

/**
 * Pense-bête : les petites choses à faire un jour précis de la semaine
 * (chercher le pain, passer l'aspirateur en haut…), avec un rappel sur le téléphone.
 */
export function PenseBete({
  taches,
  terminer,
  modifier,
  ajouterLocal,
  recharger,
}: {
  taches: Tache[]
  terminer: (t: Tache) => void
  modifier: (t: Tache) => void
  ajouterLocal: (t: Tache[]) => void
  recharger: () => void
}) {
  const { moi, autre } = useFoyer()
  const toast = useToast()
  const jours = Array.from({ length: 7 }, (_, i) => ajouterJours(aujourdhui(), i))
  const [texte, setTexte] = useState('')
  const [pour, setPour] = useState<string>(autre.cle)
  const [jour, setJour] = useState(jours[1])
  const [heure, setHeure] = useState('')
  const [autreHeure, setAutreHeure] = useState(false)
  const [filtre, setFiltre] = useState<'tout' | 'moi'>('tout')

  const visibles = useMemo(
    () => taches.filter((t) => !t.fait_le && (filtre === 'tout' || t.qui === moi.cle || t.qui === null)),
    [taches, filtre, moi.cle],
  )
  const enRetard = visibles.filter((t) => t.echeance && t.echeance < jours[0])

  async function ajouter(e: FormEvent) {
    e.preventDefault()
    // Plusieurs choses d'un coup : « chercher le pain, aspirateur en haut »
    const titres = texte
      .split(/[\n,;]+/)
      .map((x) => x.trim())
      .filter(Boolean)
    if (titres.length === 0) return
    const nouvelles: Tache[] = titres.map((t) => ({
      id: crypto.randomUUID(),
      titre: majuscule(t),
      qui: pour || null,
      echeance: jour,
      repetition: 'aucune',
      intervalle: 1,
      fait_le: null,
      fait_par: null,
      notes: null,
      cree_le: new Date().toISOString(),
      piece: null,
      genre: 'faire',
      rappel_a: heure || null,
      rappel_envoye_le: null,
      cree_par: moi.cle,
    }))
    setTexte('')
    ajouterLocal(nouvelles)
    const { error } = await table('taches').insert(
      nouvelles.map(({ id, titre, qui, echeance, rappel_a, cree_par }) => ({ id, titre, qui, echeance, rappel_a, cree_par })),
    )
    if (error) {
      toast(`Non enregistré : ${error.message}`)
      recharger()
      return
    }
    const qui = pour === moi.cle ? 'pour vous' : pour === autre.cle ? `pour ${autre.prenom}` : 'pour vous deux'
    const quand = jour === jours[0] ? "aujourd'hui" : jour === jours[1] ? 'demain' : jourComplet(jour)
    const rappel = heure ? `, rappel à ${heureCourte(heure)}` : ', dans le résumé de 8 h'
    toast(`${titres.length > 1 ? `${titres.length} choses ajoutées` : 'Ajouté'} ${qui} ${quand}${rappel}.`)
  }

  return (
    <>
      <form onSubmit={ajouter} className="mx-3 rounded-[1.4rem] bg-surface p-4 shadow-[0_8px_24px_-18px_rgb(0_0_0/0.5)]">
        <div className="flex gap-2">
          <input
            className="champ flex-1"
            value={texte}
            onChange={(e) => setTexte(e.target.value)}
            placeholder="Ex. chercher le pain, aspirateur en haut"
            aria-label="Choses à faire (séparées par des virgules)"
            enterKeyHint="done"
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={!texte.trim()}
            className="grid w-13 shrink-0 place-items-center rounded-[0.9rem] bg-encre text-fond disabled:opacity-30"
            aria-label="Ajouter au pense-bête"
          >
            <Plus size={23} />
          </button>
        </div>
        <p className="mt-1.5 px-1 text-[0.8rem] text-encre-3">Séparez par des virgules pour en ajouter plusieurs.</p>

        <p className="mt-4 mb-2 text-[0.85rem] font-semibold text-encre-2">Pour qui ?</p>
        <div role="radiogroup" aria-label="Pour qui ?" className="flex flex-wrap gap-2">
          {[
            { cle: autre.cle, libelle: autre.prenom, pastille: autre.cle as string | null },
            { cle: moi.cle, libelle: 'Moi', pastille: moi.cle as string | null },
            { cle: '', libelle: 'Nous deux', pastille: null },
          ].map((o) => (
            <button key={o.libelle} type="button" role="radio" aria-checked={pour === o.cle} className="puce" onClick={() => setPour(o.cle)}>
              <Pastille cle={o.pastille} taille={18} decoratif /> {o.libelle}
            </button>
          ))}
        </div>

        <p className="mt-4 mb-2 text-[0.85rem] font-semibold text-encre-2">Quel jour ?</p>
        <div role="radiogroup" aria-label="Quel jour ?" className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
          {jours.map((j, i) => (
            <button
              key={j}
              type="button"
              role="radio"
              aria-checked={jour === j}
              className="puce shrink-0 !px-3"
              onClick={() => setJour(j)}
            >
              {nomJour(j, i)}
            </button>
          ))}
        </div>

        <p className="mt-4 mb-2 flex items-center gap-1.5 text-[0.85rem] font-semibold text-encre-2">
          <Bell size={14} /> Rappel sur le téléphone
        </p>
        <div role="radiogroup" aria-label="Heure du rappel" className="flex flex-wrap gap-1.5">
          {HEURES.map((h) => (
            <button
              key={h.libelle}
              type="button"
              role="radio"
              aria-checked={!autreHeure && heure === h.valeur}
              className="puce !px-3"
              onClick={() => {
                setAutreHeure(false)
                setHeure(h.valeur)
              }}
            >
              {h.libelle}
            </button>
          ))}
          <button
            type="button"
            role="radio"
            aria-checked={autreHeure}
            className="puce !px-3"
            onClick={() => {
              setAutreHeure(true)
              if (!heure) setHeure('18:30')
            }}
          >
            Autre heure
          </button>
        </div>
        {autreHeure && (
          <input type="time" className="champ mt-2 !w-36" value={heure} onChange={(e) => setHeure(e.target.value)} aria-label="Heure du rappel" />
        )}
      </form>

      <div className="flex gap-2 px-5 pt-6 pb-1">
        <button type="button" className="puce" aria-pressed={filtre === 'tout'} onClick={() => setFiltre('tout')}>
          Tout
        </button>
        <button type="button" className="puce" aria-pressed={filtre === 'moi'} onClick={() => setFiltre('moi')}>
          <Pastille cle={moi.cle} taille={18} decoratif /> Pour moi
        </button>
      </div>

      {enRetard.length > 0 && (
        <div className="mt-5">
          <Section titre="En retard" ton="retard">
            <Liste>
              {enRetard.map((t) => (
                <LigneTache key={t.id} tache={t} terminer={terminer} modifier={modifier} />
              ))}
            </Liste>
          </Section>
        </div>
      )}

      {jours.map((j, i) => {
        const duJour = visibles.filter((t) => t.echeance === j).sort((a, b) => (a.rappel_a ?? '99').localeCompare(b.rappel_a ?? '99'))
        return (
          <section key={j} className="mt-5">
            <h2 className="flex items-baseline gap-2 px-5 pb-2">
              <span className={`text-[1.05rem] font-bold ${i === 0 ? '' : 'text-encre-2'}`}>
                {i < 2 ? nomJour(j, i) : majuscule(jourComplet(j))}
              </span>
              {duJour.length > 0 && <span className="nombre text-encre-3">{duJour.length}</span>}
            </h2>
            {duJour.length === 0 ? (
              <p className="mx-3 rounded-2xl border border-dashed border-trait px-4 py-3 text-[0.92rem] text-encre-3">Rien de prévu</p>
            ) : (
              <Liste>
                {duJour.map((t) => (
                  <LigneTache key={t.id} tache={t} terminer={terminer} modifier={modifier} avecPiece />
                ))}
              </Liste>
            )}
          </section>
        )
      })}
    </>
  )
}
