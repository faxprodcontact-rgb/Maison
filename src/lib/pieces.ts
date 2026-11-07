import {
  Archive,
  Bath,
  Hammer,
  Lightbulb,
  ListTodo,
  ShoppingBag,
  BedDouble,
  BedSingle,
  CookingPot,
  DoorOpen,
  Footprints,
  type LucideIcon,
  Monitor,
  Shirt,
  Sofa,
  Sun,
  Trees,
  WashingMachine,
  Warehouse,
} from 'lucide-react'
import type { GenreTache } from './types'

export type Piece = { cle: string; nom: string; court?: string; icone: LucideIcon; couleur: string }

/** Les pièces du plan (d'après le plan du robot aspirateur) */
export const PIECES_PLAN: Piece[] = [
  { cle: 'salon', nom: 'Salon', icone: Sofa, couleur: 'var(--piece-salon)' },
  { cle: 'cuisine', nom: 'Cuisine', icone: CookingPot, couleur: 'var(--piece-cuisine)' },
  { cle: 'couloir', nom: 'Couloir', icone: Footprints, couleur: 'var(--piece-couloir)' },
  { cle: 'chambre-amis', nom: "Chambre d'amis", court: "Ch. d'amis", icone: BedSingle, couleur: 'var(--piece-amis)' },
  { cle: 'salle-de-bains', nom: 'Salle de bains', court: 'Salle de bains', icone: Bath, couleur: 'var(--piece-sdb)' },
  { cle: 'chambre', nom: 'Chambre principale', court: 'Chambre', icone: BedDouble, couleur: 'var(--piece-chambre)' },
  { cle: 'dressing', nom: 'Dressing', icone: Shirt, couleur: 'var(--piece-dressing)' },
]

/** Les pièces hors du plan */
export const AUTRES_PIECES: Piece[] = [
  { cle: 'entree', nom: 'Entrée', icone: DoorOpen, couleur: 'var(--piece-autre)' },
  { cle: 'garage', nom: 'Garage', icone: Warehouse, couleur: 'var(--piece-autre)' },
  { cle: 'buanderie', nom: 'Buanderie', icone: WashingMachine, couleur: 'var(--piece-autre)' },
  { cle: 'cellier', nom: 'Cellier', icone: Archive, couleur: 'var(--piece-autre)' },
  { cle: 'bureau', nom: 'Bureau', icone: Monitor, couleur: 'var(--piece-autre)' },
  { cle: 'cuisine-ete', nom: "Cuisine d'été", icone: Sun, couleur: 'var(--piece-autre)' },
  { cle: 'exterieur', nom: 'Extérieur', icone: Trees, couleur: 'var(--piece-autre)' },
]

export const TOUTES_PIECES = [...PIECES_PLAN, ...AUTRES_PIECES]

export function piece(cle: string | null | undefined): Piece | undefined {
  return TOUTES_PIECES.find((p) => p.cle === cle)
}

export const GENRES: { cle: GenreTache; nom: string; icone: LucideIcon }[] = [
  { cle: 'faire', nom: 'À faire', icone: ListTodo },
  { cle: 'reparer', nom: 'À réparer', icone: Hammer },
  { cle: 'acheter', nom: 'À acheter', icone: ShoppingBag },
  { cle: 'idee', nom: 'Idée', icone: Lightbulb },
]

export function genre(cle: GenreTache) {
  return GENRES.find((g) => g.cle === cle) ?? GENRES[0]
}
