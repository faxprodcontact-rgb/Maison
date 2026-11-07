// Dates au format 'AAAA-MM-JJ', toujours en heure locale.

export function versISO(d: Date): string {
  const a = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const j = String(d.getDate()).padStart(2, '0')
  return `${a}-${m}-${j}`
}

export function depuisISO(s: string): Date {
  const [a, m, j] = s.slice(0, 10).split('-').map(Number)
  return new Date(a, m - 1, j)
}

export function aujourdhui(): string {
  return versISO(new Date())
}

export function ajouterJours(s: string, n: number): string {
  const d = depuisISO(s)
  d.setDate(d.getDate() + n)
  return versISO(d)
}

export function ajouterMois(s: string, n: number): string {
  const d = depuisISO(s)
  const jour = d.getDate()
  d.setDate(1)
  d.setMonth(d.getMonth() + n)
  const dernierJour = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  d.setDate(Math.min(jour, dernierJour))
  return versISO(d)
}

/** Nombre de jours de a à b (positif si b est après a). */
export function ecartJours(a: string, b: string): number {
  return Math.round((depuisISO(b).getTime() - depuisISO(a).getTime()) / 86_400_000)
}

export function debutMois(annee: number, mois: number): string {
  return versISO(new Date(annee, mois, 1))
}

export function finMois(annee: number, mois: number): string {
  return versISO(new Date(annee, mois + 1, 0))
}

const fmtJourComplet = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
const fmtJourAnnee = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
const fmtJourCourt = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
const fmtJourSemaine = new Intl.DateTimeFormat('fr-FR', { weekday: 'long' })
const fmtMois = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' })
const fmtMoisSeul = new Intl.DateTimeFormat('fr-FR', { month: 'long' })

export function majuscule(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** « samedi 7 novembre » */
export function jourComplet(s: string): string {
  return fmtJourComplet.format(depuisISO(s))
}

/** « 7 novembre 2026 » */
export function jourAvecAnnee(s: string): string {
  return fmtJourAnnee.format(depuisISO(s))
}

/** « novembre 2026 » */
export function nomMois(annee: number, mois: number): string {
  return fmtMois.format(new Date(annee, mois, 1))
}

/** « novembre » */
export function nomMoisSeul(annee: number, mois: number): string {
  return fmtMoisSeul.format(new Date(annee, mois, 1))
}

/** « aujourd'hui », « demain », « mardi », « sam. 14 nov. » */
export function jourRelatif(s: string): string {
  const ecart = ecartJours(aujourdhui(), s)
  if (ecart === 0) return "aujourd'hui"
  if (ecart === 1) return 'demain'
  if (ecart === -1) return 'hier'
  if (ecart > 1 && ecart < 7) return fmtJourSemaine.format(depuisISO(s))
  if (Math.abs(ecart) > 300) return jourAvecAnnee(s)
  return fmtJourCourt.format(depuisISO(s))
}

/** « dans 3 jours », « dans 2 semaines », « il y a 5 jours » */
export function delai(s: string): string {
  const ecart = ecartJours(aujourdhui(), s)
  if (ecart === 0) return "aujourd'hui"
  if (ecart === 1) return 'demain'
  if (ecart === -1) return 'hier'
  const n = Math.abs(ecart)
  let texte: string
  if (n < 14) texte = `${n} jours`
  else if (n < 60) texte = `${Math.round(n / 7)} semaines`
  else if (n < 365) texte = `${Math.round(n / 30)} mois`
  else {
    const ans = Math.round(n / 365)
    texte = ans === 1 ? 'un an' : `${ans} ans`
  }
  return ecart > 0 ? `dans ${texte}` : `il y a ${texte}`
}
