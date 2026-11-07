import { Check, Repeat } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { ajouterJours, aujourdhui, delai, depuisISO, ecartJours, jourRelatif, majuscule, phrase } from '../lib/dates'
import { useFoyer } from '../lib/foyer'
import { table } from '../lib/supabase'
import { prochaineEcheance, texteRepetition } from '../lib/taches'
import type { Repetition, Tache } from '../lib/types'
import { useToast } from './Toast'
import { Champ, Choix, Groupe, Pastille } from './ui'

type Appliquer = (id: string, maj: Partial<Tache> | null) => void

/** Cocher une tâche : une tâche répétée revient à sa prochaine date, les autres sont terminées. */
export function useTerminerTache(appliquer: Appliquer, recharger: () => void) {
  const { moi } = useFoyer()
  const toast = useToast()

  return async function terminer(t: Tache) {
    const avant = { echeance: t.echeance, fait_le: t.fait_le, fait_par: t.fait_par }

    if (t.fait_le) {
      // Déjà terminée : on la rouvre
      appliquer(t.id, { fait_le: null, fait_par: null })
      const { error } = await table('taches').update({ fait_le: null, fait_par: null }).eq('id', t.id)
      if (error) {
        toast(`Modification non enregistrée : ${error.message}`)
        recharger()
      }
      return
    }

    const repetee = t.repetition !== 'aucune'
    const prochaine = repetee ? prochaineEcheance(t) : null
    const maj: Partial<Tache> = repetee
      ? { echeance: prochaine, fait_par: moi.cle }
      : { fait_le: new Date().toISOString(), fait_par: moi.cle }
    const idHistorique = crypto.randomUUID()

    appliquer(t.id, maj)
    const [a, b] = await Promise.all([
      table('taches').update(maj).eq('id', t.id),
      table('taches_historique').insert({ id: idHistorique, tache_id: t.id, titre: t.titre, fait_par: moi.cle }),
    ])
    const erreur = a.error ?? b.error
    if (erreur) {
      toast(`Modification non enregistrée : ${erreur.message}`)
      recharger()
      return
    }

    toast(repetee && prochaine ? phrase(`C'est noté. Prochaine fois : ${jourRelatif(prochaine)}`) : 'Tâche terminée.', {
      libelle: 'Annuler',
      faire: async () => {
        appliquer(t.id, avant)
        await Promise.all([
          table('taches').update(avant).eq('id', t.id),
          table('taches_historique').delete().eq('id', idHistorique),
        ])
        recharger()
      },
    })
  }
}

export function LigneTache({
  tache,
  terminer,
  modifier,
}: {
  tache: Tache
  terminer: (t: Tache) => void
  modifier?: (t: Tache) => void
}) {
  const { membre } = useFoyer()
  const fait = tache.fait_le !== null
  const couleur = tache.qui ? membre(tache.qui)?.couleur : undefined
  const repetition = texteRepetition(tache.repetition, tache.intervalle)

  let quand: { texte: string; ton?: string } | null = null
  if (fait && tache.fait_le) {
    const par = membre(tache.fait_par)?.prenom
    quand = { texte: `Fait ${jourRelatif(tache.fait_le.slice(0, 10))}${par ? ` par ${par}` : ''}` }
  } else if (tache.echeance) {
    const ecart = ecartJours(aujourdhui(), tache.echeance)
    if (ecart === -1) quand = { texte: 'Prévu hier', ton: 'text-retard' }
    else if (ecart < 0) quand = { texte: `En retard de ${delai(tache.echeance).replace('il y a ', '')}`, ton: 'text-retard' }
    else quand = { texte: majuscule(jourRelatif(tache.echeance)), ton: ecart === 0 ? 'text-encre font-semibold' : undefined }
  }

  return (
    <li className="flex items-center">
      <button
        type="button"
        className="grid size-14 shrink-0 place-items-center"
        onClick={() => terminer(tache)}
        aria-label={fait ? `Rouvrir « ${tache.titre} »` : `Marquer « ${tache.titre} » comme faite`}
      >
        <span className="case" data-coche={fait} style={{ color: fait ? 'var(--encre-3)' : (couleur ?? 'var(--encre)') }}>
          {fait && <Check size={16} strokeWidth={3} />}
        </span>
      </button>
      <button
        type="button"
        className="flex min-h-15 flex-1 items-center gap-3 py-2.5 pr-4 text-left"
        onClick={() => modifier?.(tache)}
        disabled={!modifier}
      >
        <span className="flex-1">
          <span className={`block text-[1.05rem] leading-snug ${fait ? 'text-encre-3 line-through' : ''}`}>
            {tache.titre}
          </span>
          {(quand || repetition) && (
            <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[0.85rem] text-encre-2">
              {quand && <span className={quand.ton}>{quand.texte}</span>}
              {repetition && !fait && (
                <span className="inline-flex items-center gap-1 text-encre-3">
                  <Repeat size={13} />
                  {repetition}
                </span>
              )}
            </span>
          )}
        </span>
        <Pastille cle={tache.qui} taille={22} />
      </button>
    </li>
  )
}

function ceWeekEnd(): string {
  const jour = depuisISO(aujourdhui()).getDay()
  if (jour === 0 || jour === 6) return aujourdhui()
  return ajouterJours(aujourdhui(), 6 - jour)
}

const REPETITIONS: { valeur: Repetition; libelle: string; unite: string }[] = [
  { valeur: 'aucune', libelle: 'Jamais', unite: '' },
  { valeur: 'jour', libelle: 'Chaque jour', unite: 'jours' },
  { valeur: 'semaine', libelle: 'Chaque semaine', unite: 'semaines' },
  { valeur: 'mois', libelle: 'Chaque mois', unite: 'mois' },
  { valeur: 'annee', libelle: 'Chaque année', unite: 'ans' },
]

export function FormulaireTache({
  tache,
  fini,
  appliquer,
  recharger,
}: {
  tache: Partial<Tache>
  fini: () => void
  appliquer: Appliquer
  recharger: () => void
}) {
  const { membres } = useFoyer()
  const toast = useToast()
  const [titre, setTitre] = useState(tache.titre ?? '')
  const [qui, setQui] = useState<string>(tache.qui ?? '')
  const [echeance, setEcheance] = useState<string>(tache.id ? (tache.echeance ?? '') : (tache.echeance ?? aujourdhui()))
  const [repetition, setRepetition] = useState<Repetition>(tache.repetition ?? 'aucune')
  const [intervalle, setIntervalle] = useState(String(tache.intervalle ?? 1))
  const [notes, setNotes] = useState(tache.notes ?? '')
  const existante = Boolean(tache.id)

  const raccourcis = [
    { libelle: "Aujourd'hui", date: aujourdhui() },
    { libelle: 'Demain', date: ajouterJours(aujourdhui(), 1) },
    { libelle: 'Ce week-end', date: ceWeekEnd() },
    { libelle: 'Sans date', date: '' },
  ]

  async function enregistrer(e: FormEvent) {
    e.preventDefault()
    if (!titre.trim()) return
    const n = Math.min(365, Math.max(1, Number.parseInt(intervalle, 10) || 1))
    const donnees = {
      titre: majuscule(titre.trim()),
      qui: qui || null,
      echeance: echeance || (repetition !== 'aucune' ? aujourdhui() : null),
      repetition,
      intervalle: n,
      notes: notes.trim() || null,
    }
    fini()
    if (existante && tache.id) {
      appliquer(tache.id, donnees)
      const { error } = await table('taches').update(donnees).eq('id', tache.id)
      if (error) {
        toast(`Modification non enregistrée : ${error.message}`)
        recharger()
      }
    } else {
      const { error } = await table('taches').insert(donnees)
      if (error) toast(`Tâche non enregistrée : ${error.message}`)
      else toast('Tâche ajoutée.')
      recharger()
    }
  }

  async function supprimer() {
    if (!tache.id) return
    fini()
    appliquer(tache.id, null)
    const { error } = await table('taches').delete().eq('id', tache.id)
    if (error) toast(`Suppression impossible : ${error.message}`)
    else toast('Tâche supprimée.')
    recharger()
  }

  const unite = REPETITIONS.find((r) => r.valeur === repetition)?.unite

  return (
    <form onSubmit={enregistrer}>
      <Champ etiquette="Tâche">
        <input
          className="champ"
          value={titre}
          onChange={(e) => setTitre(e.target.value)}
          placeholder="Ex. Sortir les poubelles"
          required
          autoFocus={!existante}
        />
      </Champ>

      <Groupe etiquette="Qui s'en occupe ?">
        <Choix
          etiquette="Qui s'en occupe ?"
          valeur={qui}
          changer={setQui}
          options={[
            { valeur: '', libelle: <><Pastille cle={null} taille={18} decoratif /> Nous deux</> },
            ...membres.map((m) => ({ valeur: m.cle, libelle: <><Pastille cle={m.cle} taille={18} decoratif /> {m.prenom}</> })),
          ]}
        />
      </Groupe>

      <Groupe etiquette="Quand ?">
        <div className="mb-2.5 flex flex-wrap gap-2">
          {raccourcis.map((r) => (
            <button
              key={r.libelle}
              type="button"
              className="puce"
              aria-pressed={echeance === r.date}
              onClick={() => setEcheance(r.date)}
            >
              {r.libelle}
            </button>
          ))}
        </div>
        <input
          type="date"
          className="champ"
          value={echeance}
          onChange={(e) => setEcheance(e.target.value)}
          aria-label="Date"
        />
      </Groupe>

      <Groupe etiquette="Revient">
        <Choix
          etiquette="Revient"
          valeur={repetition}
          changer={setRepetition}
          options={REPETITIONS.map((r) => ({ valeur: r.valeur, libelle: r.libelle }))}
        />
        {repetition !== 'aucune' && (
          <label className="mt-3 flex items-center gap-3 text-encre-2">
            Tous les
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={365}
              className="champ nombre !w-20 text-center"
              value={intervalle}
              onChange={(e) => setIntervalle(e.target.value)}
            />
            {unite}
          </label>
        )}
      </Groupe>

      <Champ etiquette="Notes">
        <textarea className="champ min-h-20" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Champ>

      <div className="mt-2 flex gap-3">
        {existante && (
          <button type="button" className="bouton bouton-danger" onClick={() => void supprimer()}>
            Supprimer
          </button>
        )}
        <button type="submit" className="bouton bouton-principal flex-1">
          {existante ? 'Enregistrer' : 'Ajouter la tâche'}
        </button>
      </div>
    </form>
  )
}
