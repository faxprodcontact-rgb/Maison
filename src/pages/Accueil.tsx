import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { LigneTache, useTerminerTache } from '../components/Taches'
import { Liste, Pastille, Section } from '../components/ui'
import { calculerSolde } from '../lib/budget'
import { euros } from '../lib/categories'
import { ajouterJours, aujourdhui, debutMois, delai, finMois, jourComplet, majuscule, nomMoisSeul } from '../lib/dates'
import { etatEntretien } from '../lib/entretien'
import { useFoyer } from '../lib/foyer'
import { table } from '../lib/supabase'
import type { Article, Depense, Entretien, Solde, Tache } from '../lib/types'
import { useLive } from '../lib/useLive'

export function Accueil() {
  const { moi, autre } = useFoyer()
  const jour = aujourdhui()
  const maintenant = new Date()
  const annee = maintenant.getFullYear()
  const mois = maintenant.getMonth()

  const { lignes: taches, setLignes: setTaches, recharger: rechargerTaches } = useLive<Tache>('taches', () =>
    table('taches').select('*').is('fait_le', null).lte('echeance', jour).order('echeance'),
  )
  const { lignes: courses } = useLive<Pick<Article, 'id' | 'nom'>>('courses', () =>
    table('courses').select('id, nom').eq('coche', false).order('cree_le'),
  )
  const { lignes: depenses } = useLive<Pick<Depense, 'montant' | 'est_remboursement'>>('depenses', () =>
    table('depenses').select('montant, est_remboursement').gte('le', debutMois(annee, mois)).lte('le', finMois(annee, mois)),
  )
  const { lignes: soldes } = useLive<Solde>('depenses', () => table('budget_soldes').select('*'))
  const { lignes: entretien } = useLive<Entretien>('entretien', () =>
    table('entretien').select('*').lte('prochaine', ajouterJours(jour, 30)).order('prochaine'),
  )

  const terminer = useTerminerTache(
    (id, maj) => setTaches((l) => (maj ? l?.map((t) => (t.id === id ? { ...t, ...maj } : t)) : l) ?? l),
    () => void rechargerTaches(),
  )

  const aFaire = (taches ?? []).filter((t) => t.echeance && t.echeance <= jour)
  const enRetard = aFaire.filter((t) => t.echeance && t.echeance < jour).length
  const totalMois = (depenses ?? []).filter((d) => !d.est_remboursement).reduce((s, d) => s + Number(d.montant), 0)
  const solde = calculerSolde(soldes ?? [], moi.cle, autre.cle)
  const prochainEntretien = (entretien ?? [])[0]
  const entretiensEnRetard = (entretien ?? []).filter((e) => etatEntretien(e) === 'retard').length
  const nbCourses = courses?.length ?? 0

  const heure = maintenant.getHours()
  const salut = heure >= 18 || heure < 5 ? 'Bonsoir' : 'Bonjour'

  return (
    <>
      <header className="flex items-start gap-3 px-5 pt-[calc(env(safe-area-inset-top)+1.75rem)] pb-6">
        <div className="flex-1">
          <p className="text-encre-2">{majuscule(jourComplet(jour))}</p>
          <h1 className="titre-page mt-1.5">
            {salut} {moi.prenom}
          </h1>
        </div>
        <Link to="/reglages" aria-label="Réglages" className="mt-1 rounded-full">
          <Pastille cle={moi.cle} taille={40} />
        </Link>
      </header>

      <ul className="liste mx-3 overflow-hidden rounded-2xl bg-surface">
        <Resume vers="/taches" detail={enRetard > 0 ? `Dont ${enRetard} en retard` : undefined} alerte={enRetard > 0}>
          {aFaire.length > 0 ? (
            <>
              <b>
                {aFaire.length} tâche{aFaire.length > 1 ? 's' : ''}
              </b>{' '}
              à faire aujourd'hui
            </>
          ) : (
            <>
              <b>Rien</b> à faire aujourd'hui
            </>
          )}
        </Resume>

        <Resume
          vers="/courses"
          detail={nbCourses > 0 ? (courses ?? []).slice(0, 5).map((c) => c.nom).join(', ') + (nbCourses > 5 ? '…' : '') : undefined}
        >
          {nbCourses > 0 ? (
            <>
              <b>
                {nbCourses} article{nbCourses > 1 ? 's' : ''}
              </b>{' '}
              sur la liste de courses
            </>
          ) : (
            <>
              Liste de courses <b>vide</b>
            </>
          )}
        </Resume>

        <Resume
          vers="/budget"
          detail={
            solde === 0
              ? "Vous êtes à l'équilibre"
              : solde > 0
                ? `${autre.prenom} vous doit ${euros(solde)}`
                : `Vous devez ${euros(-solde)} à ${autre.prenom}`
          }
        >
          <b className="nombre">{euros(totalMois)}</b> dépensés en {nomMoisSeul(annee, mois)}
        </Resume>

        <Resume
          vers="/entretien"
          alerte={entretiensEnRetard > 0}
          detail={
            entretiensEnRetard > 1
              ? `${entretiensEnRetard} entretiens en retard`
              : (entretien ?? []).length > 1
                ? `Et ${(entretien ?? []).length - 1} autre${(entretien ?? []).length > 2 ? 's' : ''} ce mois-ci`
                : undefined
          }
        >
          {prochainEntretien?.prochaine ? (
            <>
              <b>{prochainEntretien.titre}</b>{' '}
              {etatEntretien(prochainEntretien) === 'retard' ? 'en retard' : delai(prochainEntretien.prochaine)}
            </>
          ) : (
            <>
              <b>Aucun entretien</b> dans les 30 jours
            </>
          )}
        </Resume>
      </ul>

      {aFaire.length > 0 && (
        <div className="mt-8">
          <Section titre="À faire aujourd'hui">
            <Liste>
              {aFaire.map((t) => (
                <LigneTache key={t.id} tache={t} terminer={terminer} />
              ))}
            </Liste>
          </Section>
        </div>
      )}
    </>
  )
}

function Resume({
  vers,
  children,
  detail,
  alerte,
}: {
  vers: string
  children: ReactNode
  detail?: string
  alerte?: boolean
}) {
  return (
    <li>
      <Link to={vers} className="flex items-center gap-3 px-4 py-4">
        <span className="min-w-0 flex-1">
          <span className="resume block text-[1.3rem] leading-tight tracking-tight">{children}</span>
          {detail && (
            <span className={`mt-1 block truncate text-[0.9rem] ${alerte ? 'font-semibold text-retard' : 'text-encre-2'}`}>
              {detail}
            </span>
          )}
        </span>
        <ChevronRight size={20} className="shrink-0 text-encre-3" />
      </Link>
    </li>
  )
}
