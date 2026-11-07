import { CalendarClock, Check, Flag, HelpCircle, X } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { IMPORTANCES, type Occurrence, TYPES, heureCourte, titreOccurrence, typeInfo } from '../lib/agenda'
import { ajouterJours, aujourdhui, depuisISO, jourComplet, jourRelatif, majuscule } from '../lib/dates'
import { useFoyer } from '../lib/foyer'
import { table } from '../lib/supabase'
import type { Evenement, ImportanceEvenement, TypeEvenement } from '../lib/types'
import { Sheet } from './Sheet'
import { useToast } from './Toast'
import { Champ, Choix, Groupe, Pastille } from './ui'

type Appliquer = (id: string, maj: Partial<Evenement> | null) => void

export function PuceType({ type, taille = 36 }: { type: TypeEvenement; taille?: number }) {
  const t = typeInfo(type)
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full text-white"
      style={{ width: taille, height: taille, background: t.couleur }}
      aria-hidden="true"
    >
      <t.icone size={taille * 0.5} strokeWidth={2.2} />
    </span>
  )
}

/** Un événement dans une liste */
export function CarteEvenement({
  occurrence,
  ouvrir,
  avecDate = false,
}: {
  occurrence: Occurrence
  ouvrir?: (e: Evenement) => void
  avecDate?: boolean
}) {
  const e = occurrence.evenement
  const t = typeInfo(e.type)
  const heure = heureCourte(e.heure)
  const fin = heureCourte(e.heure_fin)
  const Conteneur = ouvrir ? 'button' : 'div'
  return (
    <Conteneur
      {...(ouvrir ? { type: 'button' as const, onClick: () => ouvrir(e) } : {})}
      className="flex w-full items-center gap-3 rounded-2xl bg-surface px-3.5 py-3 text-left"
      style={{ boxShadow: `inset 4px 0 0 ${t.couleur}` }}
    >
      <PuceType type={e.type} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          {e.importance === 'important' && <Flag size={14} className="shrink-0 text-retard" fill="currentColor" aria-label="Important" />}
          <span className={`truncate text-[1.02rem] ${e.importance === 'info' ? 'text-encre-2' : 'font-semibold'}`}>
            {titreOccurrence(occurrence)}
          </span>
        </span>
        <span className="mt-0.5 block text-[0.85rem] text-encre-2">
          {majuscule(
            [
              avecDate ? jourRelatif(occurrence.le) : null,
              heure ? `${heure}${fin ? ` – ${fin}` : ''}` : e.type === 'anniversaire' ? 'chaque année' : 'toute la journée',
              e.statut === 'question' ? 'en attente de réponse' : null,
            ]
              .filter(Boolean)
              .join(', '),
          )}
        </span>
      </span>
      <Pastille cle={e.pour} taille={20} />
    </Conteneur>
  )
}

/** Répondre aux questions, et relancer celles qui ont été refusées */
export function useQuestions(appliquer: Appliquer, recharger: () => void) {
  const toast = useToast()

  async function maj(e: Evenement, donnees: Partial<Evenement>, message: string) {
    appliquer(e.id, donnees)
    const { error } = await table('evenements').update(donnees).eq('id', e.id)
    if (error) toast(`Non enregistré : ${error.message}`)
    else toast(message)
    recharger()
  }

  return {
    accepter: (e: Evenement) =>
      maj(e, { statut: 'confirme', repondu_le: new Date().toISOString() }, `C'est noté dans l'agenda : ${e.titre}.`),
    refuser: (e: Evenement) =>
      maj(e, { statut: 'refuse', repondu_le: new Date().toISOString() }, 'Réponse envoyée : pas ce jour-là.'),
    reproposer: (e: Evenement, le: string) =>
      maj(e, { statut: 'question', le, repondu_le: null }, `Nouvelle date proposée : ${jourComplet(le)}.`),
    abandonner: async (e: Evenement) => {
      appliquer(e.id, null)
      const { error } = await table('evenements').delete().eq('id', e.id)
      if (error) toast(`Suppression impossible : ${error.message}`)
      else toast('Événement supprimé.')
      recharger()
    },
  }
}

/** Les questions qui attendent quelque chose de moi */
export function QuestionsEnAttente({
  evenements,
  appliquer,
  recharger,
}: {
  evenements: Evenement[]
  appliquer: Appliquer
  recharger: () => void
}) {
  const { moi, autre, membre } = useFoyer()
  const actions = useQuestions(appliquer, recharger)
  const [autreJour, setAutreJour] = useState<Evenement | null>(null)

  const pourMoi = evenements.filter((e) => e.statut === 'question' && e.question_a === moi.cle)
  const refusees = evenements.filter((e) => e.statut === 'refuse' && e.cree_par === moi.cle)
  if (pourMoi.length === 0 && refusees.length === 0) return null

  return (
    <div className="grid gap-3">
      {pourMoi.map((e) => (
        <article key={e.id} className="rounded-[1.3rem] bg-surface p-4" style={{ boxShadow: `inset 0 0 0 2px ${typeInfo(e.type).couleur}` }}>
          <p className="flex items-center gap-2 text-[0.85rem] font-semibold text-encre-2">
            <HelpCircle size={16} /> {membre(e.cree_par)?.prenom} vous demande
          </p>
          <p className="mt-1.5 text-[1.25rem] leading-snug font-semibold">{e.titre}</p>
          <p className="mt-0.5 text-encre-2">
            {majuscule(jourComplet(e.le))}
            {e.heure && `, ${heureCourte(e.heure)}`}
          </p>
          <div className="mt-3 flex gap-2">
            <button type="button" className="bouton bouton-principal flex-1" onClick={() => void actions.accepter(e)}>
              <Check size={18} /> Oui
            </button>
            <button type="button" className="bouton bouton-secondaire flex-1" onClick={() => void actions.refuser(e)}>
              <X size={18} /> Non
            </button>
          </div>
        </article>
      ))}

      {refusees.map((e) => (
        <article key={e.id} className="rounded-[1.3rem] bg-surface p-4">
          <p className="flex items-center gap-2 text-[0.85rem] font-semibold text-retard">
            <CalendarClock size={16} /> {autre.prenom} ne peut pas {jourRelatif(e.le)}
          </p>
          <p className="mt-1.5 text-[1.15rem] font-semibold">{e.titre}</p>
          <p className="mt-0.5 text-encre-2">Voulez-vous proposer un autre jour ?</p>
          <div className="mt-3 flex gap-2">
            <button type="button" className="bouton bouton-principal flex-1" onClick={() => setAutreJour(e)}>
              Choisir un autre jour
            </button>
            <button type="button" className="bouton bouton-secondaire" onClick={() => void actions.abandonner(e)}>
              Supprimer
            </button>
          </div>
        </article>
      ))}

      <Sheet ouvert={autreJour !== null} fermer={() => setAutreJour(null)} titre="Proposer un autre jour">
        {autreJour && (
          <AutreJour
            evenement={autreJour}
            valider={(le) => {
              void actions.reproposer(autreJour, le)
              setAutreJour(null)
            }}
          />
        )}
      </Sheet>
    </div>
  )
}

function AutreJour({ evenement, valider }: { evenement: Evenement; valider: (le: string) => void }) {
  const { autre } = useFoyer()
  const [le, setLe] = useState(ajouterJours(evenement.le > aujourdhui() ? evenement.le : aujourdhui(), 1))
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (le) valider(le)
      }}
    >
      <p className="mb-5 text-encre-2">
        « {evenement.titre} » : {autre.prenom} recevra de nouveau la question avec cette date.
      </p>
      <Champ etiquette="Nouvelle date">
        <input type="date" className="champ" value={le} min={aujourdhui()} onChange={(e) => setLe(e.target.value)} required />
      </Champ>
      <button type="submit" className="bouton bouton-principal w-full">
        Proposer le {le ? jourComplet(le) : '…'}
      </button>
    </form>
  )
}

function prochainJour(jourSemaine: number): string {
  const d = depuisISO(aujourdhui()).getDay()
  const ecart = (jourSemaine - d + 7) % 7 || 7
  return ajouterJours(aujourdhui(), ecart)
}

export function FormulaireEvenement({
  evenement,
  fini,
  appliquer,
  recharger,
}: {
  evenement: Partial<Evenement>
  fini: () => void
  appliquer: Appliquer
  recharger: () => void
}) {
  const { moi, autre, membres } = useFoyer()
  const toast = useToast()
  const existant = Boolean(evenement.id)
  const [titre, setTitre] = useState(evenement.titre ?? '')
  const [type, setType] = useState<TypeEvenement>(evenement.type ?? 'rdv')
  const [le, setLe] = useState(evenement.le ?? aujourdhui())
  const [journee, setJournee] = useState(evenement.id ? !evenement.heure : true)
  const [heure, setHeure] = useState(evenement.heure?.slice(0, 5) ?? '19:00')
  const [heureFin, setHeureFin] = useState(evenement.heure_fin?.slice(0, 5) ?? '')
  const [pour, setPour] = useState(evenement.pour ?? '')
  const [importance, setImportance] = useState<ImportanceEvenement>(evenement.importance ?? 'normal')
  const [question, setQuestion] = useState(evenement.statut === 'question')
  const [anneeNaissance, setAnneeNaissance] = useState(evenement.annee_naissance ? String(evenement.annee_naissance) : '')
  const [notes, setNotes] = useState(evenement.notes ?? '')
  const anniversaire = type === 'anniversaire'
  const peutQuestionner = !anniversaire && (!existant || evenement.cree_par === moi.cle)

  async function enregistrer(e: FormEvent) {
    e.preventDefault()
    if (!titre.trim() || !le) return
    const annee = Number.parseInt(anneeNaissance, 10)
    const donnees: Partial<Evenement> = {
      titre: majuscule(titre.trim()),
      type,
      le,
      heure: journee || anniversaire ? null : heure || null,
      heure_fin: journee || anniversaire ? null : heureFin || null,
      pour: pour || null,
      importance,
      notes: notes.trim() || null,
      annuel: anniversaire,
      annee_naissance: anniversaire && annee > 1900 ? annee : null,
    }
    if (peutQuestionner) {
      const devientQuestion = question && evenement.statut !== 'question'
      donnees.statut = question ? 'question' : 'confirme'
      donnees.question_a = question ? autre.cle : null
      if (devientQuestion) donnees.repondu_le = null
    }
    fini()
    if (existant && evenement.id) {
      appliquer(evenement.id, donnees)
      const { error } = await table('evenements').update(donnees).eq('id', evenement.id)
      if (error) toast(`Non enregistré : ${error.message}`)
    } else {
      const { error } = await table('evenements').insert({ ...donnees, cree_par: moi.cle })
      if (error) toast(`Non enregistré : ${error.message}`)
      else toast(question ? `Question envoyée à ${autre.prenom}.` : 'Ajouté à l’agenda.')
    }
    recharger()
  }

  async function supprimer() {
    if (!evenement.id) return
    fini()
    appliquer(evenement.id, null)
    const { error } = await table('evenements').delete().eq('id', evenement.id)
    if (error) toast(`Suppression impossible : ${error.message}`)
    else toast('Supprimé de l’agenda.')
    recharger()
  }

  const raccourcis = [
    { libelle: "Aujourd'hui", date: aujourdhui() },
    { libelle: 'Demain', date: ajouterJours(aujourdhui(), 1) },
    { libelle: 'Samedi', date: prochainJour(6) },
    { libelle: 'Dimanche', date: prochainJour(0) },
  ]

  return (
    <form onSubmit={enregistrer}>
      <Champ etiquette={anniversaire ? 'Anniversaire de' : 'Quoi ?'}>
        <input
          className="champ"
          value={titre}
          onChange={(e) => setTitre(e.target.value)}
          placeholder={anniversaire ? 'Ex. Guillaume' : 'Ex. Dîner chez Guillaume'}
          required
          autoFocus={!existant}
        />
      </Champ>

      <Groupe etiquette="Type">
        <div className="flex flex-wrap gap-2">
          {TYPES.map((t) => (
            <button key={t.cle} type="button" className="puce" aria-pressed={type === t.cle} onClick={() => setType(t.cle)}>
              <span className="size-2.5 rounded-full" style={{ background: t.couleur }} aria-hidden="true" />
              {t.nom}
            </button>
          ))}
        </div>
      </Groupe>

      <Groupe etiquette={anniversaire ? 'Date (revient chaque année)' : 'Quand ?'}>
        {!anniversaire && (
          <div className="mb-2.5 flex flex-wrap gap-2">
            {raccourcis.map((r) => (
              <button key={r.libelle} type="button" className="puce" aria-pressed={le === r.date} onClick={() => setLe(r.date)}>
                {r.libelle}
              </button>
            ))}
          </div>
        )}
        <input type="date" className="champ" value={le} onChange={(e) => setLe(e.target.value)} aria-label="Date" required />
        {!anniversaire && (
          <>
            <label className="mt-3 flex items-center gap-3">
              <input type="checkbox" className="size-5 accent-[var(--encre)]" checked={journee} onChange={(e) => setJournee(e.target.checked)} />
              Toute la journée
            </label>
            {!journee && (
              <div className="mt-3 flex items-center gap-3">
                <input type="time" className="champ" value={heure} onChange={(e) => setHeure(e.target.value)} aria-label="Heure de début" />
                <span className="text-encre-2">à</span>
                <input type="time" className="champ" value={heureFin} onChange={(e) => setHeureFin(e.target.value)} aria-label="Heure de fin (facultatif)" />
              </div>
            )}
          </>
        )}
      </Groupe>

      {anniversaire && (
        <Champ etiquette="Année de naissance (facultatif, pour afficher l'âge)">
          <input
            className="champ nombre"
            inputMode="numeric"
            placeholder="Ex. 1992"
            value={anneeNaissance}
            onChange={(e) => setAnneeNaissance(e.target.value.replace(/\D/g, '').slice(0, 4))}
          />
        </Champ>
      )}

      {!anniversaire && (
        <Groupe etiquette="Pour qui ?">
          <Choix
            etiquette="Pour qui ?"
            valeur={pour}
            changer={setPour}
            options={[
              { valeur: '', libelle: <><Pastille cle={null} taille={18} decoratif /> Nous deux</> },
              ...membres.map((m) => ({ valeur: m.cle, libelle: <><Pastille cle={m.cle} taille={18} decoratif /> {m.prenom}</> })),
            ]}
          />
        </Groupe>
      )}

      <Groupe etiquette="Importance">
        <Choix etiquette="Importance" valeur={importance} changer={setImportance} options={IMPORTANCES.map((i) => ({ valeur: i.cle, libelle: i.nom }))} />
        <p className="mt-2 text-[0.85rem] text-encre-3">{IMPORTANCES.find((i) => i.cle === importance)?.aide}</p>
      </Groupe>

      {peutQuestionner && (
        <label className="mb-5 flex items-start gap-3 rounded-2xl bg-fond px-4 py-3">
          <input type="checkbox" className="mt-1 size-5 accent-[var(--encre)]" checked={question} onChange={(e) => setQuestion(e.target.checked)} />
          <span>
            <span className="block font-semibold">Demander d'abord à {autre.prenom}</span>
            <span className="block text-[0.88rem] text-encre-2">
              {autre.prenom} répond oui ou non. Si c'est oui, c'est ajouté à l'agenda ; sinon vous pourrez proposer un autre jour.
            </span>
          </span>
        </label>
      )}

      <Champ etiquette="Notes">
        <textarea className="champ min-h-16" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Adresse, à apporter, etc." />
      </Champ>

      <div className="mt-2 flex gap-3">
        {existant && (
          <button type="button" className="bouton bouton-danger" onClick={() => void supprimer()}>
            Supprimer
          </button>
        )}
        <button type="submit" className="bouton bouton-principal flex-1">
          {existant ? 'Enregistrer' : question ? `Envoyer la question à ${autre.prenom}` : 'Ajouter à l’agenda'}
        </button>
      </div>
    </form>
  )
}
