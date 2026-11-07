import { ajouterMois, aujourdhui, ecartJours } from './dates'
import type { Entretien } from './types'

export type Etat = 'retard' | 'bientot' | 'plus-tard' | 'sans-date'

/** « Bientôt » = dans les 30 prochains jours */
export function etatEntretien(e: Pick<Entretien, 'prochaine'>): Etat {
  if (!e.prochaine) return 'sans-date'
  const ecart = ecartJours(aujourdhui(), e.prochaine)
  if (ecart < 0) return 'retard'
  if (ecart <= 30) return 'bientot'
  return 'plus-tard'
}

export function texteFrequence(mois: number | null): string {
  if (!mois) return 'une seule fois'
  if (mois === 1) return 'tous les mois'
  if (mois === 12) return 'tous les ans'
  if (mois % 12 === 0) return `tous les ${mois / 12} ans`
  return `tous les ${mois} mois`
}

export function suivante(fait: string, frequence: number | null): string | null {
  return frequence ? ajouterMois(fait, frequence) : null
}

export const FREQUENCES: { mois: number | null; libelle: string }[] = [
  { mois: 1, libelle: '1 mois' },
  { mois: 3, libelle: '3 mois' },
  { mois: 6, libelle: '6 mois' },
  { mois: 12, libelle: '1 an' },
  { mois: 24, libelle: '2 ans' },
  { mois: null, libelle: 'Une seule fois' },
]

export const IDEES_ENTRETIEN: { titre: string; categorie: string; frequence_mois: number | null }[] = [
  { titre: 'Entretien de la chaudière', categorie: 'chauffage', frequence_mois: 12 },
  { titre: 'Ramonage', categorie: 'chauffage', frequence_mois: 12 },
  { titre: 'Détartrer le chauffe-eau', categorie: 'chauffage', frequence_mois: 24 },
  { titre: 'Tester les détecteurs de fumée', categorie: 'securite', frequence_mois: 6 },
  { titre: 'Nettoyer le filtre de la hotte', categorie: 'electromenager', frequence_mois: 3 },
  { titre: 'Nettoyer le filtre du lave-vaisselle', categorie: 'electromenager', frequence_mois: 1 },
  { titre: 'Détartrer la machine à laver', categorie: 'electromenager', frequence_mois: 3 },
  { titre: 'Contrôle technique', categorie: 'voiture', frequence_mois: 24 },
  { titre: 'Révision de la voiture', categorie: 'voiture', frequence_mois: 12 },
  { titre: "Renouvellement de l'assurance habitation", categorie: 'contrats', frequence_mois: 12 },
  { titre: 'Tailler la haie', categorie: 'jardin', frequence_mois: 6 },
]

/** L'échéance approche (ou est passée) : c'est le moment d'agir */
export function aPrevoirMaintenant(e: Pick<Entretien, 'prochaine' | 'prevenir_jours'>): boolean {
  if (!e.prochaine) return false
  return ecartJours(aujourdhui(), e.prochaine) <= e.prevenir_jours
}

const NOMS_MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']

export function nomDuMois(mois: number | null): string | null {
  return mois ? NOMS_MOIS[mois - 1] : null
}
