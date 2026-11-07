import { Cake, CalendarHeart, Circle, type LucideIcon, Stethoscope, UtensilsCrossed, Users } from 'lucide-react'
import { ajouterJours, aujourdhui, depuisISO, ecartJours, versISO } from './dates'
import type { Evenement, ImportanceEvenement, TypeEvenement } from './types'

export type TypeInfo = { cle: TypeEvenement; nom: string; icone: LucideIcon; couleur: string }

// Couleurs validées pour rester distinctes (y compris daltonisme), toujours avec une icône et un libellé
export const TYPES: TypeInfo[] = [
  { cle: 'rdv', nom: 'Rendez-vous', icone: CalendarHeart, couleur: 'var(--evt-rdv)' },
  { cle: 'sortie', nom: 'Sortie, repas', icone: UtensilsCrossed, couleur: 'var(--evt-sortie)' },
  { cle: 'famille', nom: 'Famille, amis', icone: Users, couleur: 'var(--evt-famille)' },
  { cle: 'sante', nom: 'Santé', icone: Stethoscope, couleur: 'var(--evt-sante)' },
  { cle: 'anniversaire', nom: 'Anniversaire', icone: Cake, couleur: 'var(--evt-anniv)' },
  { cle: 'autre', nom: 'Autre', icone: Circle, couleur: 'var(--evt-autre)' },
]

export function typeInfo(cle: TypeEvenement): TypeInfo {
  return TYPES.find((t) => t.cle === cle) ?? TYPES[TYPES.length - 1]
}

export const IMPORTANCES: { cle: ImportanceEvenement; nom: string; aide: string }[] = [
  { cle: 'info', nom: 'Pour info', aide: "Rappelé sur l'accueil le jour même." },
  { cle: 'normal', nom: 'Normal', aide: "Rappelé sur l'accueil 2 jours avant." },
  { cle: 'important', nom: 'Important', aide: "Rappelé sur l'accueil une semaine avant." },
]

/** Combien de jours avant l'événement il apparaît sur l'accueil */
export function joursDePreavis(e: Pick<Evenement, 'importance' | 'type'>): number {
  if (e.type === 'anniversaire') return 7
  return e.importance === 'important' ? 7 : e.importance === 'normal' ? 2 : 0
}

export type Occurrence = { evenement: Evenement; le: string; age: number | null }

/** Date d'un anniversaire (ou de tout événement annuel) pour une année donnée */
function dansLAnnee(le: string, annee: number): string {
  const d = depuisISO(le)
  const mois = d.getMonth()
  const jour = Math.min(d.getDate(), new Date(annee, mois + 1, 0).getDate())
  return versISO(new Date(annee, mois, jour))
}

/** Toutes les occurrences entre deux dates incluses (les anniversaires reviennent chaque année). */
export function occurrences(evenements: Evenement[], debut: string, fin: string): Occurrence[] {
  const resultat: Occurrence[] = []
  const anneeDebut = depuisISO(debut).getFullYear()
  const anneeFin = depuisISO(fin).getFullYear()
  for (const e of evenements) {
    if (e.annuel) {
      for (let annee = anneeDebut; annee <= anneeFin; annee++) {
        const le = dansLAnnee(e.le, annee)
        if (le >= debut && le <= fin) {
          resultat.push({ evenement: e, le, age: e.annee_naissance ? annee - e.annee_naissance : null })
        }
      }
    } else if (e.le >= debut && e.le <= fin) {
      resultat.push({ evenement: e, le: e.le, age: null })
    }
  }
  return resultat.sort((a, b) => a.le.localeCompare(b.le) || (a.evenement.heure ?? '').localeCompare(b.evenement.heure ?? ''))
}

/** Événements à rappeler sur l'accueil (selon leur importance) */
export function aRappeler(evenements: Evenement[]): Occurrence[] {
  const jour = aujourdhui()
  return occurrences(
    evenements.filter((e) => e.statut === 'confirme'),
    jour,
    ajouterJours(jour, 7),
  ).filter((o) => ecartJours(jour, o.le) <= joursDePreavis(o.evenement))
}

export function heureCourte(h: string | null): string | null {
  if (!h) return null
  const [hh, mm] = h.split(':')
  return mm === '00' ? `${Number(hh)} h` : `${Number(hh)} h ${mm}`
}

export function titreOccurrence(o: Occurrence): string {
  if (o.evenement.type === 'anniversaire') {
    return o.age ? `${o.evenement.titre} (${o.age} ans)` : o.evenement.titre
  }
  return o.evenement.titre
}

