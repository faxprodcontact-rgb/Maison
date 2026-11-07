import { Bell, BellOff, BellRing, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useFoyer } from '../lib/foyer'
import {
  type EtatNotifications,
  activerNotifications,
  desactiverNotifications,
  envoyerEssai,
  etatNotifications,
} from '../lib/notifications'
import { table } from '../lib/supabase'
import { useToast } from './Toast'

function useEtat() {
  const [etat, setEtat] = useState<EtatNotifications | null>(null)
  const actualiser = () => void etatNotifications().then(setEtat)
  useEffect(actualiser, [])
  return { etat, actualiser }
}

const CHOIX: { cle: 'notif_mots' | 'notif_agenda' | 'notif_matin'; nom: string; aide: string }[] = [
  { cle: 'notif_mots', nom: 'Petits mots', aide: 'Quand on vous laisse un mot, ou qu’on réagit au vôtre.' },
  { cle: 'notif_agenda', nom: 'Agenda', aide: 'Questions à répondre, réponses, nouveaux rendez-vous.' },
  { cle: 'notif_matin', nom: 'Résumé du matin', aide: 'À 8 h : rendez-vous, tâches, menu, entretiens à prévoir.' },
]

/** Section « Notifications » des réglages */
export function ReglagesNotifications() {
  const { moi } = useFoyer()
  const toast = useToast()
  const { etat, actualiser } = useEtat()
  const [occupe, setOccupe] = useState(false)

  async function activer() {
    setOccupe(true)
    try {
      await activerNotifications(moi.cle)
      toast('Notifications activées sur ce téléphone.')
    } catch (e) {
      toast((e as Error).message)
    } finally {
      setOccupe(false)
      actualiser()
    }
  }

  async function desactiver() {
    setOccupe(true)
    await desactiverNotifications().catch(() => undefined)
    setOccupe(false)
    actualiser()
    toast('Notifications désactivées sur ce téléphone.')
  }

  async function essayer() {
    setOccupe(true)
    try {
      const n = await envoyerEssai()
      toast(n > 0 ? 'Notification envoyée : elle arrive dans quelques secondes.' : 'Aucun téléphone abonné pour le moment.')
    } catch (e) {
      toast(`Essai impossible : ${(e as Error).message}`)
    } finally {
      setOccupe(false)
    }
  }

  async function changer(cle: (typeof CHOIX)[number]['cle'], valeur: boolean) {
    const { error } = await table('membres').update({ [cle]: valeur }).eq('cle', moi.cle)
    if (error) toast(`Réglage non enregistré : ${error.message}`)
  }

  return (
    <section className="mx-3 mt-6 rounded-2xl bg-surface px-4 py-4">
      <h2 className="flex items-center gap-2 text-[1.15rem] font-semibold">
        <Bell size={19} /> Notifications
      </h2>

      {etat === 'non-supporte' && (
        <p className="mt-2 text-encre-2">Ce navigateur ne permet pas de recevoir des notifications.</p>
      )}
      {etat === 'a-installer' && (
        <p className="mt-2 text-encre-2">
          Sur iPhone, les notifications marchent quand Mervans est sur l'écran d'accueil : dans Safari, touchez Partager puis
          « Sur l'écran d'accueil », ouvrez Mervans depuis son icône, puis revenez ici.
        </p>
      )}
      {etat === 'refuse' && (
        <p className="mt-2 text-encre-2">
          Les notifications ont été refusées pour Mervans. Autorisez-les dans les réglages du téléphone (Réglages, puis
          Notifications, puis Mervans), puis revenez ici.
        </p>
      )}
      {etat === 'inactif' && (
        <>
          <p className="mt-2 text-encre-2">Recevez les petits mots, les questions de l'agenda et le résumé du matin sur ce téléphone.</p>
          <button type="button" className="bouton bouton-principal mt-4 w-full" onClick={() => void activer()} disabled={occupe}>
            <BellRing size={18} /> {occupe ? 'Activation…' : 'Activer les notifications'}
          </button>
        </>
      )}
      {etat === 'actif' && (
        <>
          <p className="mt-2 font-semibold text-ok">Activées sur ce téléphone.</p>
          <div className="mt-4 flex gap-2">
            <button type="button" className="bouton bouton-secondaire flex-1 !px-3" onClick={() => void essayer()} disabled={occupe}>
              Envoyer un essai
            </button>
            <button type="button" className="bouton bouton-danger !px-3" onClick={() => void desactiver()} disabled={occupe}>
              <BellOff size={17} /> Désactiver
            </button>
          </div>
        </>
      )}

      <h3 className="mt-6 font-semibold">Ce que je veux recevoir</h3>
      <ul className="mt-2 grid gap-1">
        {CHOIX.map((c) => {
          const actif = moi[c.cle] !== false
          return (
            <li key={c.cle}>
              <label className="flex items-start gap-3 py-2">
                <span className="flex-1">
                  <span className="block font-medium">{c.nom}</span>
                  <span className="block text-[0.88rem] text-encre-2">{c.aide}</span>
                </span>
                <input
                  type="checkbox"
                  role="switch"
                  className="interrupteur mt-1"
                  checked={actif}
                  onChange={(e) => void changer(c.cle, e.target.checked)}
                />
              </label>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

const CLE_BANDEAU = 'mervans-bandeau-notifications'

/** Petit bandeau sur l'accueil pour proposer d'activer les notifications */
export function BandeauNotifications() {
  const { moi } = useFoyer()
  const toast = useToast()
  const { etat, actualiser } = useEtat()
  const [masque, setMasque] = useState(() => {
    try {
      return localStorage.getItem(CLE_BANDEAU) === '1'
    } catch {
      return false
    }
  })
  if (masque || (etat !== 'inactif' && etat !== 'a-installer')) return null

  function fermer() {
    setMasque(true)
    try {
      localStorage.setItem(CLE_BANDEAU, '1')
    } catch {
      // pas de stockage : le bandeau reviendra à la prochaine ouverture
    }
  }

  return (
    <div className="mx-3 mt-5 flex items-center gap-3 rounded-2xl bg-surface px-4 py-3">
      <BellRing size={22} className="shrink-0" />
      <p className="flex-1 text-[0.95rem] leading-snug">
        <span className="font-semibold">Recevez les petits mots sur votre téléphone.</span>
      </p>
      {etat === 'inactif' ? (
        <button
          type="button"
          className="shrink-0 rounded-full bg-encre px-3.5 py-2 text-[0.88rem] font-bold text-fond"
          onClick={() =>
            void activerNotifications(moi.cle)
              .then(() => toast('Notifications activées sur ce téléphone.'))
              .catch((e: Error) => toast(e.message))
              .finally(actualiser)
          }
        >
          Activer
        </button>
      ) : (
        <Link to="/reglages" className="shrink-0 rounded-full bg-encre px-3.5 py-2 text-[0.88rem] font-bold text-fond">
          Comment ?
        </Link>
      )}
      <button type="button" onClick={fermer} className="-mr-1 grid size-8 shrink-0 place-items-center text-encre-3" aria-label="Masquer">
        <X size={17} />
      </button>
    </div>
  )
}
