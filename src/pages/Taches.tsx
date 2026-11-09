import { ChevronRight, Plus } from 'lucide-react'
import { type FormEvent, useMemo, useState } from 'react'
import { PenseBete } from '../components/PenseBete'
import { PlanMaison } from '../components/PlanMaison'
import { Sheet } from '../components/Sheet'
import { FormulaireTache, LigneTache, useTerminerTache } from '../components/Taches'
import { useToast } from '../components/Toast'
import { BoutonAjouter, Chargement, Choix, Erreur, Liste, Pastille, TitrePage } from '../components/ui'
import { ajouterJours, aujourdhui, majuscule } from '../lib/dates'
import { useFoyer } from '../lib/foyer'
import { AUTRES_PIECES, GENRES, type Piece, TOUTES_PIECES } from '../lib/pieces'
import { table } from '../lib/supabase'
import type { GenreTache, Tache } from '../lib/types'
import { useLive } from '../lib/useLive'

type Onglet = 'pense' | 'plan' | 'autres' | 'tout'

export function Taches() {
  const { membres } = useFoyer()
  const [onglet, setOnglet] = useState<Onglet>('pense')
  const [filtre, setFiltre] = useState('tout')
  const [pieceOuverte, setPieceOuverte] = useState<Piece | null>(null)
  const [edition, setEdition] = useState<Partial<Tache> | null>(null)

  const ilYa14Jours = ajouterJours(aujourdhui(), -14)
  const { lignes, setLignes, erreur, recharger } = useLive<Tache>('taches', () =>
    table('taches')
      .select('*')
      .or(`fait_le.is.null,fait_le.gte.${ilYa14Jours}`)
      .order('echeance', { ascending: true, nullsFirst: false })
      .order('cree_le'),
  )

  const appliquer = (id: string, maj: Partial<Tache> | null) =>
    setLignes((l) => (maj ? l?.map((t) => (t.id === id ? { ...t, ...maj } : t)) : l?.filter((t) => t.id !== id)) ?? l)
  const terminer = useTerminerTache(appliquer, () => void recharger())

  const aFaire = useMemo(() => (lignes ?? []).filter((t) => !t.fait_le), [lignes])
  const compteurs = useMemo(() => {
    const c: Record<string, number> = {}
    for (const t of aFaire) if (t.piece) c[t.piece] = (c[t.piece] ?? 0) + 1
    return c
  }, [aFaire])

  return (
    <>
      <TitrePage apres={aFaire.length > 0 && <span className="nombre pb-1 text-encre-2">{aFaire.length} à faire</span>}>
        Tâches
      </TitrePage>

      <div className="px-5 pb-5">
        <Choix
          etiquette="Affichage"
          valeur={onglet}
          changer={setOnglet}
          options={[
            { valeur: 'pense', libelle: 'Pense-bête' },
            { valeur: 'plan', libelle: 'Plan' },
            { valeur: 'autres', libelle: 'Autres pièces' },
            { valeur: 'tout', libelle: 'Tout' },
          ]}
        />
      </div>

      {erreur && <Erreur message={erreur} />}
      {!lignes && !erreur && <Chargement />}

      {lignes && onglet === 'pense' && (
        <PenseBete
          taches={lignes}
          terminer={terminer}
          modifier={setEdition}
          ajouterLocal={(nouvelles) => setLignes((l) => [...(l ?? []), ...nouvelles])}
          recharger={() => void recharger()}
        />
      )}

      {lignes && onglet === 'plan' && (
        <div className="px-3">
          <div className="rounded-[1.6rem] bg-surface p-2 shadow-[0_10px_30px_-24px_rgb(0_0_0/0.6)]">
            <PlanMaison compteurs={compteurs} ouvrir={setPieceOuverte} />
          </div>
          <p className="px-3 pt-3 text-[0.92rem] text-encre-2">
            Touchez une pièce pour voir ce qu'il y a à y faire, ou y ajouter quelque chose.
          </p>
        </div>
      )}

      {lignes && onglet === 'autres' && (
        <div className="grid grid-cols-2 gap-3 px-3">
          {AUTRES_PIECES.map((p) => {
            const n = compteurs[p.cle] ?? 0
            return (
              <button
                key={p.cle}
                type="button"
                onClick={() => setPieceOuverte(p)}
                className="flex flex-col items-start gap-3 rounded-[1.4rem] bg-surface p-4 text-left"
              >
                <span className="grid size-11 place-items-center rounded-full" style={{ background: p.couleur }}>
                  <p.icone size={22} />
                </span>
                <span>
                  <span className="block text-[1.05rem] font-semibold">{p.nom}</span>
                  <span className={`text-[0.88rem] ${n > 0 ? 'font-semibold text-encre' : 'text-encre-3'}`}>
                    {n === 0 ? 'Rien à faire' : `${n} à faire`}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      )}

      {lignes && onglet === 'tout' && (
        <VueGlobale
          taches={aFaire}
          filtre={filtre}
          setFiltre={setFiltre}
          membres={membres.map((m) => ({ cle: m.cle, prenom: m.prenom }))}
          terminer={terminer}
          modifier={setEdition}
          ouvrirPiece={setPieceOuverte}
        />
      )}

      <BoutonAjouter libelle="Ajouter une tâche" onClick={() => setEdition({})} />

      <Sheet ouvert={pieceOuverte !== null && edition === null} fermer={() => setPieceOuverte(null)} titre={pieceOuverte?.nom ?? ''}>
        {pieceOuverte && (
          <FichePiece
            piece={pieceOuverte}
            taches={(lignes ?? []).filter((t) => t.piece === pieceOuverte.cle)}
            terminer={terminer}
            modifier={setEdition}
            ajouterLocal={(t) => setLignes((l) => [...(l ?? []), t])}
            recharger={() => void recharger()}
          />
        )}
      </Sheet>

      <Sheet ouvert={edition !== null} fermer={() => setEdition(null)} titre={edition?.id ? 'Modifier la tâche' : 'Nouvelle tâche'}>
        {edition && (
          <FormulaireTache
            key={edition.id ?? `nouvelle-${edition.piece ?? ''}`}
            tache={edition}
            fini={() => setEdition(null)}
            appliquer={appliquer}
            recharger={() => void recharger()}
          />
        )}
      </Sheet>
    </>
  )
}

/** Ce qu'il y a à faire dans une pièce, avec un ajout rapide */
function FichePiece({
  piece,
  taches,
  terminer,
  modifier,
  ajouterLocal,
  recharger,
}: {
  piece: Piece
  taches: Tache[]
  terminer: (t: Tache) => void
  modifier: (t: Partial<Tache>) => void
  ajouterLocal: (t: Tache) => void
  recharger: () => void
}) {
  const toast = useToast()
  const { moi } = useFoyer()
  const [titre, setTitre] = useState('')
  const [genre, setGenre] = useState<GenreTache>('faire')
  const [voirFaites, setVoirFaites] = useState(false)
  const aFaire = taches.filter((t) => !t.fait_le)
  const faites = taches.filter((t) => t.fait_le)

  async function ajouter(e: FormEvent) {
    e.preventDefault()
    const propre = titre.trim()
    if (!propre) return
    setTitre('')
    const nouvelle: Tache = {
      id: crypto.randomUUID(),
      titre: majuscule(propre),
      piece: piece.cle,
      genre,
      qui: null,
      echeance: null,
      repetition: 'aucune',
      intervalle: 1,
      fait_le: null,
      fait_par: null,
      notes: null,
      cree_le: new Date().toISOString(),
    }
    ajouterLocal(nouvelle)
    const { error } = await table('taches').insert({ id: nouvelle.id, titre: nouvelle.titre, piece: piece.cle, genre, cree_par: moi.cle })
    if (error) {
      toast(`Non enregistré : ${error.message}`)
      recharger()
    }
  }

  return (
    <div>
      <form onSubmit={ajouter} className="mb-4">
        <div className="flex gap-2">
          <input
            className="champ flex-1"
            value={titre}
            onChange={(e) => setTitre(e.target.value)}
            placeholder="Ex. changer l'ampoule, réparer la poignée"
            aria-label={`Nouvelle chose à faire : ${piece.nom}`}
            enterKeyHint="done"
          />
          <button
            type="submit"
            disabled={!titre.trim()}
            className="grid w-13 shrink-0 place-items-center rounded-[0.9rem] bg-encre text-fond disabled:opacity-40"
            aria-label="Ajouter"
          >
            <Plus size={22} />
          </button>
        </div>
        <div role="radiogroup" aria-label="Genre" className="mt-2.5 flex flex-wrap gap-1.5">
          {GENRES.map((g) => (
            <button
              key={g.cle}
              type="button"
              role="radio"
              aria-checked={genre === g.cle}
              className="puce !px-3 !py-1.5 !text-[0.85rem]"
              onClick={() => setGenre(g.cle)}
            >
              <g.icone size={15} />
              {g.nom}
            </button>
          ))}
        </div>
      </form>

      {aFaire.length === 0 ? (
        <p className="rounded-2xl bg-fond px-4 py-5 text-center text-encre-2">Rien à faire ici pour le moment.</p>
      ) : (
        <ul className="liste overflow-hidden rounded-2xl bg-fond">
          {aFaire.map((t) => (
            <LigneTache key={t.id} tache={t} terminer={terminer} modifier={modifier} />
          ))}
        </ul>
      )}

      {faites.length > 0 && (
        <div className="mt-4">
          <button
            type="button"
            className="text-[0.92rem] font-semibold text-encre-2 underline underline-offset-4"
            onClick={() => setVoirFaites((v) => !v)}
            aria-expanded={voirFaites}
          >
            {voirFaites ? 'Masquer' : 'Voir'} ce qui a été fait ({faites.length})
          </button>
          {voirFaites && (
            <ul className="liste mt-2 overflow-hidden rounded-2xl bg-fond">
              {faites.map((t) => (
                <LigneTache key={t.id} tache={t} terminer={terminer} modifier={modifier} />
              ))}
            </ul>
          )}
        </div>
      )}

      <button
        type="button"
        className="mt-5 text-[0.92rem] font-semibold underline underline-offset-4"
        onClick={() => modifier({ piece: piece.cle })}
      >
        Ajouter avec une date, une personne ou une répétition
      </button>
    </div>
  )
}

function VueGlobale({
  taches,
  filtre,
  setFiltre,
  membres,
  terminer,
  modifier,
  ouvrirPiece,
}: {
  taches: Tache[]
  filtre: string
  setFiltre: (f: string) => void
  membres: { cle: string; prenom: string }[]
  terminer: (t: Tache) => void
  modifier: (t: Tache) => void
  ouvrirPiece: (p: Piece) => void
}) {
  const visibles = taches.filter((t) => filtre === 'tout' || t.qui === filtre || t.qui === null)
  const groupes = [
    ...TOUTES_PIECES.map((p) => ({ piece: p as Piece | null, taches: visibles.filter((t) => t.piece === p.cle) })),
    { piece: null, taches: visibles.filter((t) => !t.piece || !TOUTES_PIECES.some((p) => p.cle === t.piece)) },
  ].filter((g) => g.taches.length > 0)
  const enRetard = visibles.filter((t) => t.echeance && t.echeance < aujourdhui()).length

  return (
    <>
      <div className="px-5 pb-4">
        <Choix
          etiquette="Afficher les tâches de"
          valeur={filtre}
          changer={setFiltre}
          options={[
            { valeur: 'tout', libelle: 'Toutes' },
            ...membres.map((m) => ({
              valeur: m.cle,
              libelle: (
                <>
                  <Pastille cle={m.cle} taille={18} decoratif /> {m.prenom}
                </>
              ),
            })),
          ]}
        />
        {enRetard > 0 && <p className="mt-3 font-semibold text-retard">{enRetard} en retard</p>}
      </div>

      {groupes.length === 0 && <p className="px-5 py-6 text-[1.2rem] font-semibold">Rien à faire dans toute la maison.</p>}

      <div className="grid gap-6">
        {groupes.map(({ piece: p, taches: liste }) => (
          <section key={p?.cle ?? 'sans-piece'}>
            <div className="flex items-center gap-2 px-5 pb-2">
              {p ? (
                <button type="button" className="flex flex-1 items-center gap-2 text-left" onClick={() => ouvrirPiece(p)}>
                  <span className="grid size-7 place-items-center rounded-full" style={{ background: p.couleur }}>
                    <p.icone size={15} />
                  </span>
                  <span className="font-semibold">{p.nom}</span>
                  <span className="nombre text-encre-3">{liste.length}</span>
                  <ChevronRight size={16} className="text-encre-3" />
                </button>
              ) : (
                <span className="flex-1 font-semibold text-encre-2">Sans pièce</span>
              )}
            </div>
            <Liste>
              {liste.map((t) => (
                <LigneTache key={t.id} tache={t} terminer={terminer} modifier={modifier} />
              ))}
            </Liste>
          </section>
        ))}
      </div>
    </>
  )
}
