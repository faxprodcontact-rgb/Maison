// Mervans : envoi des notifications sur les téléphones (Web Push)
//
// Appelée par la base de données (nouveau petit mot, réaction, question ou réponse de
// l'agenda, résumé du matin) avec le secret partagé rangé dans le coffre-fort (Vault),
// ou par l'app pour une notification d'essai (avec la connexion de la personne).
// Les clés de signature (VAPID) sont générées au premier lancement et rangées dans le
// coffre-fort : elles ne quittent jamais le serveur.

import postgres from 'npm:postgres@3.4.5'
import webpush from 'npm:web-push@3.6.7'

const sql = postgres(Deno.env.get('SUPABASE_DB_URL')!, { prepare: false, max: 3, idle_timeout: 20 })
const PREFIXES = new Set(['maison_', 'essai_'])
const APP = 'https://faxprodcontact-rgb.github.io/Maison/'
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

type Cles = { appel: string; publique: string; privee: string }
type Preference = 'notif_mots' | 'notif_agenda' | 'notif_matin' | 'notif_taches'
type Notif = { titre: string; texte: string; url: string; tag?: string }
type Ligne = Record<string, unknown>

let cles: Cles | null = null

function base64url(octets: Uint8Array): string {
  let s = ''
  for (const o of octets) s += String.fromCharCode(o)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function lireSecret(nom: string): Promise<string | null> {
  const r = await sql`select decrypted_secret from vault.decrypted_secrets where name = ${nom} limit 1`
  return (r[0]?.decrypted_secret as string | undefined) ?? null
}

async function chargerCles(): Promise<Cles> {
  if (cles) return cles
  let publique = await lireSecret('mervans_vapid_publique')
  let privee = await lireSecret('mervans_vapid_privee')
  if (!publique || !privee) {
    // Première fois : création d'une paire de clés P-256, rangée directement dans le coffre-fort
    const paire = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])
    const nouvellePublique = base64url(new Uint8Array(await crypto.subtle.exportKey('raw', paire.publicKey)))
    const nouvellePrivee = (await crypto.subtle.exportKey('jwk', paire.privateKey)).d!
    try {
      await sql.begin(async (t) => {
        await t`select vault.create_secret(${nouvellePrivee}, 'mervans_vapid_privee', 'Mervans : clé privée VAPID')`
        await t`select vault.create_secret(${nouvellePublique}, 'mervans_vapid_publique', 'Mervans : clé publique VAPID')`
      })
    } catch {
      // Une autre instance vient de les créer
      await new Promise((r) => setTimeout(r, 500))
    }
    publique = await lireSecret('mervans_vapid_publique')
    privee = await lireSecret('mervans_vapid_privee')
  }
  const appel = await lireSecret('mervans_secret_appel')
  if (!appel || !publique || !privee) throw new Error('Secrets manquants dans le coffre-fort')
  webpush.setVapidDetails(APP, publique, privee)
  cles = { appel, publique, privee }
  return cles
}

function egal(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let d = 0
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return d === 0
}

function json(corps: unknown, statut = 200): Response {
  return new Response(JSON.stringify(corps), { status: statut, headers: { ...CORS, 'Content-Type': 'application/json' } })
}

// ---------------------------------------------------------------------------
// Dates (heure de Paris)
// ---------------------------------------------------------------------------
const TZ = 'Europe/Paris'
const aujourdhui = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
const heureParis = () => Number(new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', hour12: false }).format(new Date()))
function plusJours(iso: string, n: number): string {
  const d = new Date(`${iso}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
const fmtJour = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
function quand(iso: string): string {
  const a = aujourdhui()
  if (iso === a) return "aujourd'hui"
  if (iso === plusJours(a, 1)) return 'demain'
  return fmtJour.format(new Date(`${iso}T12:00:00Z`))
}
function heureCourte(h: unknown): string {
  if (typeof h !== 'string' || !h) return ''
  const [hh, mm] = h.split(':')
  return mm === '00' ? `${Number(hh)} h` : `${Number(hh)} h ${mm}`
}
function heure(h: unknown): string {
  const court = heureCourte(h)
  return court ? ` à ${court}` : ''
}
const maintenantParis = () =>
  new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date())

// ---------------------------------------------------------------------------
// Envoi
// ---------------------------------------------------------------------------
async function envoyer(p: string, pour: string[], pref: Preference | null, n: Notif) {
  if (pour.length === 0) return []
  const membres = await sql`
    select cle, notif_mots, notif_agenda, notif_matin, notif_taches from ${sql(`${p}membres`)}
    where cle in ${sql(pour)} and user_id is not null`
  const ok = membres.filter((m) => !pref || m[pref]).map((m) => m.cle as string)
  if (ok.length === 0) return []
  const abonnements = await sql`select endpoint, p256dh, auth, membre from ${sql(`${p}abonnements`)} where membre in ${sql(ok)}`
  const resultats: Ligne[] = []
  for (const a of abonnements) {
    try {
      const r = await webpush.sendNotification(
        { endpoint: a.endpoint as string, keys: { p256dh: a.p256dh as string, auth: a.auth as string } },
        JSON.stringify(n),
        { TTL: 12 * 3600, urgency: pref === 'notif_matin' ? 'normal' : 'high' },
      )
      resultats.push({ membre: a.membre, statut: r.statusCode })
    } catch (e) {
      const err = e as { statusCode?: number; body?: string; message?: string }
      if (err.statusCode === 404 || err.statusCode === 410) {
        await sql`delete from ${sql(`${p}abonnements`)} where endpoint = ${a.endpoint as string}`
      }
      resultats.push({ membre: a.membre, statut: err.statusCode ?? 'erreur', detail: String(err.body ?? err.message ?? e).slice(0, 160) })
    }
  }
  return resultats
}

async function prenoms(p: string): Promise<Record<string, string>> {
  const r = await sql`select cle, prenom from ${sql(`${p}membres`)}`
  return Object.fromEntries(r.map((x) => [x.cle as string, x.prenom as string]))
}

// ---------------------------------------------------------------------------
// Petits mots
// ---------------------------------------------------------------------------
async function surMessage(p: string, operation: string, m: Ligne, ancien: Ligne | null) {
  const noms = await prenoms(p)
  const de = m.de as string
  const autres = Object.keys(noms).filter((c) => c !== de)
  const texte = typeof m.texte === 'string' ? m.texte.trim() : ''
  if (operation === 'INSERT') {
    const titre =
      m.importance === 'doux' ? `💌 Mot doux de ${noms[de]}` : m.importance === 'important' ? `❗ ${noms[de]} : important` : `💬 ${noms[de]}`
    return envoyer(p, autres, 'notif_mots', { titre, texte: texte || '📷 Photo', url: `${APP}#/`, tag: `mot-${m.id}` })
  }
  if (operation === 'UPDATE' && m.reaction && m.reaction !== ancien?.reaction) {
    return envoyer(p, [de], 'notif_mots', {
      titre: `${noms[autres[0]] ?? ''} a réagi ${m.reaction}`,
      texte: texte ? `« ${texte.slice(0, 80)} »` : 'à votre photo',
      url: `${APP}#/`,
      tag: `reaction-${m.id}`,
    })
  }
  return []
}

// ---------------------------------------------------------------------------
// Agenda
// ---------------------------------------------------------------------------
async function surEvenement(p: string, operation: string, e: Ligne, ancien: Ligne | null) {
  const noms = await prenoms(p)
  const createur = e.cree_par as string
  const questionA = (e.question_a as string | null) ?? null
  const le = e.le as string
  const date = `${quand(le)}${heure(e.heure)}`
  const url = `${APP}#/agenda`
  const titre = e.titre as string

  if (operation === 'INSERT') {
    if (e.statut === 'question' && questionA) {
      return envoyer(p, [questionA], 'notif_agenda', { titre: `❓ ${noms[createur]} vous demande`, texte: `${titre} (${date})`, url, tag: `question-${e.id}` })
    }
    if (e.statut === 'confirme' && e.importance !== 'info') {
      const autres = Object.keys(noms).filter((c) => c !== createur)
      return envoyer(p, autres, 'notif_agenda', { titre: `📅 ${noms[createur]} a ajouté à l'agenda`, texte: `${titre}, ${date}`, url, tag: `evt-${e.id}` })
    }
    return []
  }
  if (ancien?.statut === 'question' && e.statut === 'confirme') {
    return envoyer(p, [createur], 'notif_agenda', { titre: `✅ ${noms[questionA ?? ''] ?? ''} a dit oui`, texte: `${titre}, ${date}`, url, tag: `question-${e.id}` })
  }
  if (ancien?.statut === 'question' && e.statut === 'refuse') {
    return envoyer(p, [createur], 'notif_agenda', {
      titre: `${noms[questionA ?? ''] ?? ''} ne peut pas ${quand(le)}`,
      texte: `${titre} : proposez un autre jour dans l'agenda.`,
      url,
      tag: `question-${e.id}`,
    })
  }
  if (e.statut === 'question' && questionA && (ancien?.statut !== 'question' || ancien?.le !== le)) {
    return envoyer(p, [questionA], 'notif_agenda', { titre: `❓ ${noms[createur]} propose un autre jour`, texte: `${titre} (${date})`, url, tag: `question-${e.id}` })
  }
  return []
}

// ---------------------------------------------------------------------------
// Pense-bête : prévenir quand l'autre ajoute quelque chose pour vous, puis rappel à l'heure
// ---------------------------------------------------------------------------
async function surTache(p: string, operation: string, t: Ligne) {
  if (operation !== 'INSERT') return []
  const qui = (t.qui as string | null) ?? null
  const createur = (t.cree_par as string | null) ?? null
  const echeance = (t.echeance as string | null) ?? null
  if (!qui || !createur || qui === createur || !echeance) return []
  const auj = aujourdhui()
  if (echeance < auj || echeance > plusJours(auj, 7)) return []
  const noms = await prenoms(p)
  const rappel = t.rappel_a ? `, rappel${heure(t.rappel_a)}` : ''
  return envoyer(p, [qui], 'notif_taches', {
    titre: `📝 ${noms[createur]} a ajouté pour vous`,
    texte: `${t.titre} (${quand(echeance)}${rappel})`,
    url: `${APP}#/taches`,
    tag: `tache-${t.id}`,
  })
}

async function rappels(p: string) {
  const t = (nom: string) => sql(`${p}${nom}`)
  const auj = aujourdhui()
  const dues = await sql`
    select id, titre, qui from ${t('taches')}
    where fait_le is null and echeance = ${auj}::date and rappel_a is not null
      and rappel_a <= ${maintenantParis()}::time and rappel_envoye_le is null`
  if (dues.length === 0) return []
  await sql`update ${t('taches')} set rappel_envoye_le = now() where id in ${sql(dues.map((d) => d.id as string))}`
  const membres = await sql`select cle from ${t('membres')} where user_id is not null`
  const parPersonne = new Map<string, string[]>()
  for (const d of dues) {
    const pour = d.qui ? [d.qui as string] : membres.map((m) => m.cle as string)
    for (const cle of pour) parPersonne.set(cle, [...(parPersonne.get(cle) ?? []), d.titre as string])
  }
  const resultats: Ligne[] = []
  for (const [cle, titres] of parPersonne) {
    resultats.push(
      ...(await envoyer(p, [cle], 'notif_taches', {
        titre: titres.length > 1 ? `📝 Pense-bête : ${titres.length} choses à faire` : '📝 Pense-bête',
        texte: titres.join('\n'),
        url: `${APP}#/taches`,
        tag: `rappel-${auj}-${maintenantParis()}`,
      })),
    )
  }
  return resultats
}

// ---------------------------------------------------------------------------
// Résumé du matin (8 h à Paris)
// ---------------------------------------------------------------------------
async function matin(p: string, force: boolean) {
  if (!force && heureParis() !== 8) return { ignore: "il n'est pas 8 h à Paris" }
  const t = (nom: string) => sql(`${p}${nom}`)
  const auj = aujourdhui()
  const demain = plusJours(auj, 1)
  const dans7 = plusJours(auj, 7)
  const dans30 = plusJours(auj, 30)
  const moisJour = (iso: string) => iso.slice(5)

  const membres = await sql`select cle, prenom from ${t('membres')} where user_id is not null and notif_matin`
  const evenements = await sql`
    select titre, le::text as le, heure::text as heure, type, importance, statut, question_a, annuel, annee_naissance
    from ${t('evenements')} where statut <> 'refuse'`
  const taches = await sql`
    select qui, titre, echeance::text as echeance, rappel_a::text as rappel_a from ${t('taches')}
    where fait_le is null and echeance <= ${auj}::date order by rappel_a nulls first`
  const menus = await sql`select titre, moment from ${t('menus')} where le = ${auj}::date order by moment`
  const entretiens = await sql`
    select titre, rappel from ${t('entretien')}
    where prochaine is not null and (prochaine - prevenir_jours = ${auj}::date or prochaine = ${auj}::date)`
  const garanties = await sql`
    select titre, expire_le::text as expire_le from ${t('documents')}
    where categorie = 'garantie' and expire_le in (${dans30}::date, ${auj}::date)`

  const resultats: Ligne[] = []
  for (const m of membres) {
    const lignes: string[] = []
    for (const e of evenements) {
      if (e.statut !== 'confirme') continue
      const le = e.le as string
      if (e.annuel ? moisJour(le) === moisJour(auj) : le === auj) {
        lignes.push(
          e.type === 'anniversaire'
            ? `🎂 Anniversaire : ${e.titre}${e.annee_naissance ? ` (${Number(auj.slice(0, 4)) - Number(e.annee_naissance)} ans)` : ''}`
            : `📅 ${e.titre}${heure(e.heure)}`,
        )
      } else if (!e.annuel && le === demain && e.importance !== 'info') {
        lignes.push(`📅 Demain : ${e.titre}${heure(e.heure)}`)
      } else if (e.annuel && moisJour(le) === moisJour(dans7)) {
        lignes.push(`🎂 Anniversaire de ${e.titre} dans une semaine`)
      }
    }
    const questions = evenements.filter((e) => e.statut === 'question' && e.question_a === m.cle).length
    if (questions) lignes.push(`❓ ${questions} question${questions > 1 ? 's attendent' : ' attend'} votre réponse`)
    const sesTaches = taches.filter((x) => x.qui === null || x.qui === m.cle)
    const duJour = sesTaches.filter((x) => x.echeance === auj)
    if (duJour.length) {
      const liste = duJour.slice(0, 4).map((x) => `${x.titre}${x.rappel_a ? ` (${heureCourte(x.rappel_a)})` : ''}`).join(', ')
      lignes.push(`📝 Aujourd'hui : ${liste}${duJour.length > 4 ? ` et ${duJour.length - 4} autre${duJour.length > 5 ? 's' : ''}` : ''}`)
    }
    const enRetard = sesTaches.length - duJour.length
    if (enRetard) lignes.push(`⏰ ${enRetard} tâche${enRetard > 1 ? 's' : ''} en retard`)
    for (const r of menus) lignes.push(`🍽️ Au menu ce ${r.moment === 'midi' ? 'midi' : 'soir'} : ${r.titre}`)
    for (const e of entretiens) lignes.push(`🔧 ${e.titre}${e.rappel ? ` : ${e.rappel}` : ''}`)
    for (const g of garanties) {
      lignes.push(g.expire_le === auj ? `🧾 La garantie « ${g.titre} » se termine aujourd'hui` : `🧾 La garantie « ${g.titre} » se termine dans un mois`)
    }
    if (lignes.length === 0) continue
    resultats.push(
      ...(await envoyer(p, [m.cle as string], 'notif_matin', {
        titre: `☀️ Bonjour ${m.prenom}`,
        texte: lignes.join('\n'),
        url: `${APP}#/`,
        tag: `matin-${auj}`,
      })),
    )
  }
  return resultats
}

// ---------------------------------------------------------------------------
// Notification d'essai, demandée depuis l'app par une personne connectée
// ---------------------------------------------------------------------------
async function essai(req: Request, p: string) {
  const jeton = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
  const r = await fetch(`${Deno.env.get('SUPABASE_URL')}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${jeton}`, apikey: Deno.env.get('SUPABASE_ANON_KEY')! },
  })
  if (!r.ok) return json({ erreur: 'Connexion requise' }, 401)
  const utilisateur = (await r.json()) as { id: string }
  const membre = await sql`select cle, prenom from ${sql(`${p}membres`)} where user_id = ${utilisateur.id}`
  if (membre.length === 0) return json({ erreur: 'Ce compte ne fait pas partie du foyer' }, 403)
  const resultats = await envoyer(p, [membre[0].cle as string], null, {
    titre: '🔔 Mervans',
    texte: `Les notifications marchent sur ce téléphone, ${membre[0].prenom} !`,
    url: `${APP}#/reglages`,
    tag: 'essai',
  })
  return json({ envoyees: resultats.filter((x) => x.statut === 201 || x.statut === 200).length, resultats })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  try {
    const k = await chargerCles()
    const chemin = new URL(req.url).pathname

    if (req.method === 'GET' && chemin.endsWith('/cle-publique')) return json({ cle: k.publique })

    if (req.method !== 'POST') return json({ erreur: 'Méthode non prise en charge' }, 405)
    const corps = (await req.json()) as Ligne
    const p = corps.prefixe as string
    if (!PREFIXES.has(p)) return json({ erreur: 'Préfixe inconnu' }, 400)

    if (corps.type === 'essai') return await essai(req, p)

    const secret = req.headers.get('x-mervans-secret') ?? ''
    if (!egal(secret, k.appel)) return json({ erreur: 'Non autorisé' }, 401)

    if (corps.type === 'matin') return json(await matin(p, corps.force === true))
    if (corps.type === 'rappels') return json(await rappels(p))
    const operation = corps.operation as string
    const nouveau = corps.nouveau as Ligne
    const ancien = (corps.ancien as Ligne | null) ?? null
    if (corps.table === `${p}messages`) return json(await surMessage(p, operation, nouveau, ancien))
    if (corps.table === `${p}evenements`) return json(await surEvenement(p, operation, nouveau, ancien))
    if (corps.table === `${p}taches`) return json(await surTache(p, operation, nouveau))
    return json({ ignore: true })
  } catch (e) {
    console.error(e)
    return json({ erreur: String((e as Error).message ?? e) }, 500)
  }
})
