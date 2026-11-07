import { SUPABASE_URL } from './config'
import { PREFIXE, supabase, table } from './supabase'

export type EtatNotifications = 'non-supporte' | 'a-installer' | 'refuse' | 'inactif' | 'actif'

const estIOS =
  /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
const installee =
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true

export async function etatNotifications(): Promise<EtatNotifications> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return estIOS && !installee ? 'a-installer' : 'non-supporte'
  }
  if (Notification.permission === 'denied') return 'refuse'
  const enregistrement = await navigator.serviceWorker.getRegistration()
  const abonnement = await enregistrement?.pushManager.getSubscription()
  return abonnement && Notification.permission === 'granted' ? 'actif' : 'inactif'
}

function versOctets(base64url: string): Uint8Array<ArrayBuffer> {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (base64url.length % 4)) % 4)
  const brut = atob(base64)
  const octets = new Uint8Array(new ArrayBuffer(brut.length))
  for (let i = 0; i < brut.length; i++) octets[i] = brut.charCodeAt(i)
  return octets
}

function appareil(): string {
  const ua = navigator.userAgent
  if (/iPhone/.test(ua)) return 'iPhone'
  if (/iPad/.test(ua)) return 'iPad'
  if (/Android/.test(ua)) return 'Android'
  if (/Mac/.test(ua)) return 'Mac'
  if (/Windows/.test(ua)) return 'PC'
  return 'Navigateur'
}

/** À appeler directement depuis un bouton (le téléphone exige un geste de la personne). */
export async function activerNotifications(moi: string) {
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    throw new Error("Les notifications n'ont pas été autorisées sur ce téléphone.")
  }
  const enregistrement = await navigator.serviceWorker.ready
  let abonnement = await enregistrement.pushManager.getSubscription()
  if (!abonnement) {
    const reponse = await fetch(`${SUPABASE_URL}/functions/v1/mervans-notifications/cle-publique`)
    const { cle } = (await reponse.json()) as { cle: string }
    try {
      abonnement = await enregistrement.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: versOctets(cle) })
    } catch (e) {
      const message = String((e as Error).message ?? e)
      throw new Error(
        /permission|denied|not allowed/i.test(message)
          ? 'Le téléphone bloque les notifications pour Mervans : autorisez-les dans ses réglages, puis réessayez.'
          : `Activation impossible pour le moment (${message}). Réessayez plus tard.`,
      )
    }
  }
  const j = abonnement.toJSON()
  const { error } = await table('abonnements').upsert({
    endpoint: j.endpoint,
    membre: moi,
    p256dh: j.keys?.p256dh,
    auth: j.keys?.auth,
    appareil: appareil(),
  })
  if (error) throw new Error(error.message)
}

export async function desactiverNotifications() {
  const enregistrement = await navigator.serviceWorker.getRegistration()
  const abonnement = await enregistrement?.pushManager.getSubscription()
  if (!abonnement) return
  await table('abonnements').delete().eq('endpoint', abonnement.endpoint)
  await abonnement.unsubscribe()
}

/** Envoie une notification d'essai sur les téléphones de la personne connectée. */
export async function envoyerEssai(): Promise<number> {
  const { data, error } = await supabase.functions.invoke('mervans-notifications', {
    body: { type: 'essai', prefixe: PREFIXE },
  })
  if (error) throw new Error(error.message)
  return (data as { envoyees: number }).envoyees
}
