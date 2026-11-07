import {
  AlarmSmoke,
  ArrowLeftRight,
  BadgeCheck,
  Car,
  CircleEllipsis,
  Flame,
  Gift,
  HeartPulse,
  House,
  KeyRound,
  type LucideIcon,
  Plane,
  Receipt,
  ShieldCheck,
  ShoppingCart,
  Sprout,
  Tv,
  UtensilsCrossed,
  WashingMachine,
  Wrench,
  Zap,
} from 'lucide-react'

export type Categorie = { cle: string; nom: string; icone: LucideIcon }

export const CATEGORIES_BUDGET: Categorie[] = [
  { cle: 'courses', nom: 'Courses', icone: ShoppingCart },
  { cle: 'logement', nom: 'Loyer ou crédit', icone: KeyRound },
  { cle: 'factures', nom: 'Énergie et factures', icone: Zap },
  { cle: 'maison', nom: 'Maison et travaux', icone: House },
  { cle: 'transport', nom: 'Transport', icone: Car },
  { cle: 'sante', nom: 'Santé', icone: HeartPulse },
  { cle: 'sorties', nom: 'Restos et sorties', icone: UtensilsCrossed },
  { cle: 'vacances', nom: 'Loisirs et vacances', icone: Plane },
  { cle: 'abonnements', nom: 'Abonnements', icone: Tv },
  { cle: 'cadeaux', nom: 'Cadeaux', icone: Gift },
  { cle: 'autre', nom: 'Autre', icone: CircleEllipsis },
]

export const REMBOURSEMENT: Categorie = { cle: 'remboursement', nom: 'Remboursement', icone: ArrowLeftRight }

export function categorieBudget(cle: string): Categorie {
  if (cle === REMBOURSEMENT.cle) return REMBOURSEMENT
  return CATEGORIES_BUDGET.find((c) => c.cle === cle) ?? CATEGORIES_BUDGET[CATEGORIES_BUDGET.length - 1]
}

export const CATEGORIES_ENTRETIEN: Categorie[] = [
  { cle: 'chauffage', nom: 'Chauffage et eau', icone: Flame },
  { cle: 'electromenager', nom: 'Électroménager', icone: WashingMachine },
  { cle: 'securite', nom: 'Sécurité', icone: AlarmSmoke },
  { cle: 'voiture', nom: 'Voiture', icone: Car },
  { cle: 'jardin', nom: 'Jardin', icone: Sprout },
  { cle: 'contrats', nom: 'Contrats et assurances', icone: ShieldCheck },
  { cle: 'garanties', nom: 'Garanties', icone: BadgeCheck },
  { cle: 'administratif', nom: 'Papiers', icone: Receipt },
  { cle: 'maison', nom: 'Maison', icone: Wrench },
]

export function categorieEntretien(cle: string): Categorie {
  return CATEGORIES_ENTRETIEN.find((c) => c.cle === cle) ?? CATEGORIES_ENTRETIEN[CATEGORIES_ENTRETIEN.length - 1]
}

const fmtEuros = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })
const fmtEurosRond = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

export function euros(montant: number, arrondi = false): string {
  return (arrondi ? fmtEurosRond : fmtEuros).format(montant)
}

/** « 12,50 » ou « 12.5 » → 12.5 ; null si invalide */
export function lireMontant(texte: string): number | null {
  const n = Number(texte.replace(/\s/g, '').replace(',', '.').replace('€', ''))
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.round(n * 100) / 100
}
