import { BellRing, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { CarteEvenement, QuestionsEnAttente } from '../components/Agenda'
import { MaisonDessin, couleurTexteSurCiel, momentDeLaJournee } from '../components/MaisonDessin'
import { Messages } from '../components/Messages'
import { Pastille } from '../components/ui'
import { aRappeler } from '../lib/agenda'
import { categorieEntretien } from '../lib/categories'
import { aujourdhui, delai, jourComplet, majuscule } from '../lib/dates'
import { aPrevoirMaintenant } from '../lib/entretien'
import { useFoyer } from '../lib/foyer'
import { table } from '../lib/supabase'
import type { Entretien, Evenement } from '../lib/types'
import { useLive } from '../lib/useLive'

export function Accueil() {
  const { moi } = useFoyer()
  const moment = momentDeLaJournee()
  const texte = couleurTexteSurCiel(moment)
  const salut = moment === 'soir' || moment === 'nuit' ? 'Bonsoir' : 'Bonjour'

  const { lignes: evenements, setLignes, recharger } = useLive<Evenement>('evenements', () =>
    table('evenements').select('*').order('le'),
  )
  const { lignes: entretien } = useLive<Entretien>('entretien', () =>
    table('entretien').select('*').not('prochaine', 'is', null).order('prochaine'),
  )

  const appliquer = (id: string, maj: Partial<Evenement> | null) =>
    setLignes((l) => (maj ? l?.map((e) => (e.id === id ? { ...e, ...maj } : e)) : l?.filter((e) => e.id !== id)) ?? l)

  const rappels = aRappeler(evenements ?? [])
  const aEntretenir = (entretien ?? []).filter(aPrevoirMaintenant).slice(0, 4)
  const questions = (evenements ?? []).filter(
    (e) => (e.statut === 'question' && e.question_a === moi.cle) || (e.statut === 'refuse' && e.cree_par === moi.cle),
  )
  const rienABientot = rappels.length === 0 && aEntretenir.length === 0 && questions.length === 0

  return (
    <>
      <header className="relative overflow-hidden rounded-b-[2.2rem]">
        <MaisonDessin moment={moment} className="block aspect-[4/3] max-h-[24rem] w-full" />
        <div
          className="absolute inset-x-0 top-0 flex items-start gap-3 px-5 pt-[calc(env(safe-area-inset-top)+1.25rem)]"
          style={{ color: texte }}
        >
          <div className="flex-1">
            <p className="text-[0.95rem] font-semibold opacity-80">{majuscule(jourComplet(aujourdhui()))}</p>
            <h1 className="titre-page mt-1">
              {salut} {moi.prenom}
            </h1>
          </div>
          <Link to="/reglages" aria-label="Réglages" className="rounded-full">
            <Pastille cle={moi.cle} taille={40} />
          </Link>
        </div>
      </header>

      <div className="mt-6">
        <Messages />
      </div>

      {!rienABientot && (
        <section aria-labelledby="titre-bientot" className="mt-9 px-3">
          <h2 id="titre-bientot" className="px-2 pb-3 text-[1.35rem] font-bold tracking-tight">
            Bientôt
          </h2>
          <div className="grid gap-3">
            {evenements && <QuestionsEnAttente evenements={evenements} appliquer={appliquer} recharger={() => void recharger()} />}
            {rappels.map((o) => (
              <Link key={`${o.evenement.id}-${o.le}`} to="/agenda" className="block">
                <CarteEvenement occurrence={o} avecDate />
              </Link>
            ))}
            {aEntretenir.map((e) => {
              const c = categorieEntretien(e.categorie)
              return (
                <Link key={e.id} to="/entretien" className="flex items-start gap-3 rounded-2xl bg-surface px-3.5 py-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-2">
                    <c.icone size={18} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 font-semibold">
                      <BellRing size={14} className="shrink-0 text-retard" /> {e.titre}
                    </span>
                    <span className="mt-0.5 block text-[0.88rem] text-encre-2">
                      {e.prochaine && e.prochaine < aujourdhui() ? 'En retard. ' : `${majuscule(delai(e.prochaine ?? ''))}. `}
                      {e.rappel}
                    </span>
                  </span>
                  <ChevronRight size={18} className="mt-1 shrink-0 text-encre-3" />
                </Link>
              )
            })}
          </div>
        </section>
      )}
    </>
  )
}
