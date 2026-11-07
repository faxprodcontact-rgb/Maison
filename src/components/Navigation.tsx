import { CalendarDays, House, ListChecks, ShoppingBasket, Wallet, Wrench } from 'lucide-react'
import { useFoyer } from '../lib/foyer'
import { NavLink } from 'react-router-dom'
import { aujourdhui } from '../lib/dates'
import { table } from '../lib/supabase'
import { useLive } from '../lib/useLive'

const ONGLETS = [
  { vers: '/', libelle: 'Accueil', icone: House },
  { vers: '/courses', libelle: 'Courses', icone: ShoppingBasket },
  { vers: '/taches', libelle: 'Tâches', icone: ListChecks },
  { vers: '/agenda', libelle: 'Agenda', icone: CalendarDays },
  { vers: '/budget', libelle: 'Budget', icone: Wallet },
  { vers: '/entretien', libelle: 'Entretien', icone: Wrench },
]

export function Navigation() {
  const { moi } = useFoyer()
  // Pastilles sur les onglets : articles à acheter, tâches du jour, entretien en retard
  const { lignes: courses } = useLive<{ id: string }>('courses', () =>
    table('courses').select('id').eq('coche', false),
  )
  const { lignes: taches } = useLive<{ id: string }>('taches', () =>
    table('taches').select('id').is('fait_le', null).lte('echeance', aujourdhui()),
  )
  const { lignes: entretien } = useLive<{ id: string }>('entretien', () =>
    table('entretien').select('id').lte('prochaine', aujourdhui()),
  )
  // Questions qui attendent ma réponse, ou mes questions refusées
  const { lignes: questions } = useLive<{ id: string }>('evenements', () =>
    table('evenements')
      .select('id')
      .or(`and(statut.eq.question,question_a.eq.${moi.cle}),and(statut.eq.refuse,cree_par.eq.${moi.cle})`),
  )

  const compteurs: Record<string, number> = {
    '/courses': courses?.length ?? 0,
    '/taches': taches?.length ?? 0,
    '/entretien': entretien?.length ?? 0,
    '/agenda': questions?.length ?? 0,
  }

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-trait bg-fond/90 backdrop-blur-md"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Navigation principale"
    >
      <ul className="mx-auto flex h-[var(--hauteur-nav)] max-w-xl">
        {ONGLETS.map(({ vers, libelle, icone: Icone }) => {
          const n = compteurs[vers] ?? 0
          const alerte = vers !== '/courses'
          return (
            <li key={vers} className="flex-1">
              <NavLink
                to={vers}
                end={vers === '/'}
                className={({ isActive }) =>
                  `flex h-full flex-col items-center justify-center gap-1 text-[0.68rem] ${
                    isActive ? 'font-bold text-encre' : 'font-medium text-encre-3'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span className="relative">
                      <Icone size={23} strokeWidth={isActive ? 2.3 : 1.8} />
                      {n > 0 && (
                        <span
                          className={`absolute -top-1.5 -right-2.5 grid h-[1.1rem] min-w-[1.1rem] place-items-center rounded-full px-1 text-[0.65rem] leading-none font-bold text-white ${
                            alerte ? 'bg-retard' : 'bg-encre-2'
                          }`}
                        >
                          {n > 99 ? '99+' : n}
                        </span>
                      )}
                    </span>
                    {libelle}
                  </>
                )}
              </NavLink>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
