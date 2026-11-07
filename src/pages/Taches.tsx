import { Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Sheet } from '../components/Sheet'
import { FormulaireTache, LigneTache, useTerminerTache } from '../components/Taches'
import { BoutonAjouter, Chargement, Choix, Erreur, Liste, Pastille, Section, TitrePage, Vide } from '../components/ui'
import { ajouterJours, aujourdhui } from '../lib/dates'
import { useFoyer } from '../lib/foyer'
import { table } from '../lib/supabase'
import { IDEES_TACHES, texteRepetition } from '../lib/taches'
import type { Tache } from '../lib/types'
import { useLive } from '../lib/useLive'

export function Taches() {
  const { membres } = useFoyer()
  const [filtre, setFiltre] = useState('tout')
  const [edition, setEdition] = useState<Partial<Tache> | null>(null)
  const [voirTerminees, setVoirTerminees] = useState(false)

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

  const groupes = useMemo(() => {
    const jour = aujourdhui()
    const dansSemaine = ajouterJours(jour, 7)
    const visibles = (lignes ?? []).filter((t) => filtre === 'tout' || t.qui === filtre || t.qui === null)
    const aFaire = visibles
      .filter((t) => !t.fait_le)
      .sort((a, b) => (a.echeance ?? '9999').localeCompare(b.echeance ?? '9999'))
    return {
      retard: aFaire.filter((t) => t.echeance && t.echeance < jour),
      aujourdhui: aFaire.filter((t) => t.echeance === jour),
      semaine: aFaire.filter((t) => t.echeance && t.echeance > jour && t.echeance < dansSemaine),
      plusTard: aFaire.filter((t) => t.echeance && t.echeance >= dansSemaine),
      sansDate: aFaire.filter((t) => !t.echeance),
      terminees: visibles.filter((t) => t.fait_le).sort((a, b) => (b.fait_le ?? '').localeCompare(a.fait_le ?? '')),
      total: aFaire.length,
    }
  }, [lignes, filtre])

  const blocs: { titre: string; taches: Tache[]; ton?: 'retard' }[] = [
    { titre: 'En retard', taches: groupes.retard, ton: 'retard' },
    { titre: "Aujourd'hui", taches: groupes.aujourdhui },
    { titre: 'Cette semaine', taches: groupes.semaine },
    { titre: 'Plus tard', taches: groupes.plusTard },
    { titre: 'Sans date', taches: groupes.sansDate },
  ]

  const rien = lignes !== null && (lignes ?? []).length === 0

  return (
    <>
      <TitrePage>Tâches</TitrePage>

      {!rien && (
        <div className="px-5 pb-5">
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
        </div>
      )}

      {erreur && <Erreur message={erreur} />}
      {!lignes && !erreur && <Chargement />}

      {rien && (
        <Vide titre="Aucune tâche pour l'instant.">
          <p>Ajoutez les tâches de la maison et qui s'en occupe. Les tâches répétées reviennent toutes seules une fois cochées.</p>
          <p className="mt-5 mb-2 font-semibold text-encre">Pour commencer</p>
          <div className="flex flex-wrap gap-2">
            {IDEES_TACHES.map((idee) => (
              <button
                key={idee.titre}
                type="button"
                className="puce"
                onClick={() => setEdition({ titre: idee.titre, repetition: idee.repetition, intervalle: idee.intervalle })}
              >
                <Plus size={15} className="text-encre-3" />
                {idee.titre}
                <span className="text-encre-3">{texteRepetition(idee.repetition, idee.intervalle)}</span>
              </button>
            ))}
          </div>
        </Vide>
      )}

      {lignes && !rien && groupes.total === 0 && (
        <Vide titre="Tout est fait.">Rien d'autre à faire pour le moment.</Vide>
      )}

      {blocs
        .filter((b) => b.taches.length > 0)
        .map((b) => (
          <Section key={b.titre} titre={b.titre} ton={b.ton} apres={<span className="nombre text-encre-3">{b.taches.length}</span>}>
            <Liste>
              {b.taches.map((t) => (
                <LigneTache key={t.id} tache={t} terminer={terminer} modifier={setEdition} />
              ))}
            </Liste>
          </Section>
        ))}

      {groupes.terminees.length > 0 && (
        <div className="mt-6">
          <button
            type="button"
            className="px-5 py-2 text-[0.95rem] font-semibold text-encre-2 underline underline-offset-4"
            onClick={() => setVoirTerminees((v) => !v)}
            aria-expanded={voirTerminees}
          >
            {voirTerminees ? 'Masquer' : 'Voir'} les tâches terminées ({groupes.terminees.length})
          </button>
          {voirTerminees && (
            <div className="mt-2">
              <Liste>
                {groupes.terminees.map((t) => (
                  <LigneTache key={t.id} tache={t} terminer={terminer} modifier={setEdition} />
                ))}
              </Liste>
            </div>
          )}
        </div>
      )}

      <BoutonAjouter libelle="Ajouter une tâche" onClick={() => setEdition({})} />

      <Sheet
        ouvert={edition !== null}
        fermer={() => setEdition(null)}
        titre={edition?.id ? 'Modifier la tâche' : 'Nouvelle tâche'}
      >
        {edition && (
          <FormulaireTache
            key={edition.id ?? 'nouvelle'}
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
