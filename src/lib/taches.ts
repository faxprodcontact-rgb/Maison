import { ajouterJours, ajouterMois, aujourdhui } from './dates'
import type { Repetition, Tache } from './types'

function avancer(date: string, repetition: Repetition, intervalle: number): string {
  switch (repetition) {
    case 'jour':
      return ajouterJours(date, intervalle)
    case 'semaine':
      return ajouterJours(date, 7 * intervalle)
    case 'mois':
      return ajouterMois(date, intervalle)
    case 'annee':
      return ajouterMois(date, 12 * intervalle)
    default:
      return date
  }
}

/** Prochaine échéance d'une tâche répétée, toujours après aujourd'hui. */
export function prochaineEcheance(tache: Pick<Tache, 'echeance' | 'repetition' | 'intervalle'>): string {
  const jour = aujourdhui()
  let suivante = avancer(tache.echeance ?? jour, tache.repetition, tache.intervalle)
  while (suivante <= jour) suivante = avancer(suivante, tache.repetition, tache.intervalle)
  return suivante
}

export function texteRepetition(repetition: Repetition, intervalle: number): string | null {
  if (repetition === 'aucune') return null
  if (intervalle === 1) {
    return { jour: 'chaque jour', semaine: 'chaque semaine', mois: 'chaque mois', annee: 'chaque année' }[repetition]
  }
  const unite = { jour: 'jours', semaine: 'semaines', mois: 'mois', annee: 'ans' }[repetition]
  return `tous les ${intervalle} ${unite}`
}

export const IDEES_TACHES: { titre: string; repetition: Repetition; intervalle: number }[] = [
  { titre: 'Sortir les poubelles', repetition: 'semaine', intervalle: 1 },
  { titre: "Passer l'aspirateur", repetition: 'semaine', intervalle: 1 },
  { titre: 'Nettoyer la salle de bain', repetition: 'semaine', intervalle: 1 },
  { titre: 'Changer les draps', repetition: 'semaine', intervalle: 2 },
  { titre: 'Arroser les plantes', repetition: 'semaine', intervalle: 1 },
  { titre: 'Nettoyer le frigo', repetition: 'mois', intervalle: 1 },
  { titre: 'Laver les vitres', repetition: 'mois', intervalle: 3 },
]
