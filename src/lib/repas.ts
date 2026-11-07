// Idées de repas de tous les jours, avec ce qu'il faut acheter
// (sel, poivre, huile et autres basiques du placard ne sont pas listés).

export type Repas = {
  nom: string
  emoji: string
  duree: string
  saison: 'froid' | 'chaud' | 'toute'
  vege?: boolean
  ingredients: string[]
}

export const REPAS: Repas[] = [
  { nom: 'Pot-au-feu', emoji: '🍲', duree: '3 h', saison: 'froid', ingredients: ['Bœuf à pot-au-feu', 'Os à moelle', 'Carottes', 'Poireaux', 'Navets', 'Pommes de terre', 'Oignon'] },
  { nom: 'Tartiflette', emoji: '🧀', duree: '45 min', saison: 'froid', ingredients: ['Pommes de terre', 'Reblochon', 'Lardons', 'Oignons', 'Crème fraîche'] },
  { nom: 'Soupe de potiron', emoji: '🎃', duree: '40 min', saison: 'froid', vege: true, ingredients: ['Potiron', 'Pommes de terre', 'Oignon', 'Bouillon de légumes', 'Crème fraîche'] },
  { nom: 'Bœuf bourguignon', emoji: '🥘', duree: '3 h', saison: 'froid', ingredients: ['Bœuf à braiser', 'Vin rouge', 'Lardons', 'Champignons', 'Carottes', 'Oignons'] },
  { nom: 'Blanquette de veau', emoji: '🍚', duree: '2 h', saison: 'froid', ingredients: ['Veau pour blanquette', 'Carottes', 'Champignons', 'Crème fraîche', 'Citron', 'Riz'] },
  { nom: 'Raclette', emoji: '🫕', duree: '20 min', saison: 'froid', ingredients: ['Fromage à raclette', 'Pommes de terre', 'Charcuterie', 'Cornichons'] },
  { nom: 'Lasagnes', emoji: '🍝', duree: '1 h 15', saison: 'toute', ingredients: ['Viande hachée', 'Pâtes à lasagnes', 'Coulis de tomate', 'Oignon', 'Lait', 'Emmental râpé'] },
  { nom: 'Quiche lorraine', emoji: '🥧', duree: '50 min', saison: 'toute', ingredients: ['Pâte brisée', 'Lardons', 'Œufs', 'Crème fraîche', 'Salade'] },
  { nom: 'Endives au jambon', emoji: '🥬', duree: '50 min', saison: 'froid', ingredients: ['Endives', 'Jambon', 'Lait', 'Emmental râpé'] },
  { nom: 'Hachis parmentier', emoji: '🥔', duree: '1 h', saison: 'froid', ingredients: ['Viande hachée', 'Pommes de terre', 'Oignon', 'Lait', 'Emmental râpé'] },
  { nom: 'Choucroute', emoji: '🌭', duree: '1 h 30', saison: 'froid', ingredients: ['Choucroute', 'Saucisses de Strasbourg', 'Saucisses fumées', 'Lard fumé', 'Pommes de terre', 'Vin blanc'] },
  { nom: 'Potée lorraine', emoji: '🥣', duree: '2 h 30', saison: 'froid', ingredients: ['Palette fumée', 'Chou vert', 'Carottes', 'Navets', 'Pommes de terre', 'Saucisses fumées'] },
  { nom: 'Chili con carne', emoji: '🌶️', duree: '1 h', saison: 'froid', ingredients: ['Viande hachée', 'Haricots rouges', 'Tomates pelées', 'Oignon', 'Poivron', 'Riz'] },
  { nom: 'Spaghetti bolognaise', emoji: '🍝', duree: '40 min', saison: 'toute', ingredients: ['Spaghetti', 'Viande hachée', 'Coulis de tomate', 'Oignon', 'Carotte', 'Parmesan'] },
  { nom: 'Pâtes carbonara', emoji: '🍝', duree: '20 min', saison: 'toute', ingredients: ['Pâtes', 'Lardons', 'Œufs', 'Parmesan'] },
  { nom: 'Poulet curry coco', emoji: '🍛', duree: '35 min', saison: 'toute', ingredients: ['Blancs de poulet', 'Lait de coco', 'Curry', 'Oignon', 'Riz', 'Coriandre'] },
  { nom: 'Fajitas au poulet', emoji: '🌮', duree: '30 min', saison: 'toute', ingredients: ['Tortillas', 'Blancs de poulet', 'Poivrons', 'Oignon', 'Crème fraîche', 'Cheddar râpé'] },
  { nom: 'Pizza maison', emoji: '🍕', duree: '30 min', saison: 'toute', ingredients: ['Pâte à pizza', 'Coulis de tomate', 'Mozzarella', 'Jambon', 'Champignons', 'Olives'] },
  { nom: 'Burgers maison', emoji: '🍔', duree: '30 min', saison: 'toute', ingredients: ['Pains à burger', 'Steaks hachés', 'Cheddar', 'Tomates', 'Salade', 'Frites'] },
  { nom: 'Omelette aux champignons', emoji: '🍳', duree: '15 min', saison: 'toute', vege: true, ingredients: ['Œufs', 'Champignons', 'Ciboulette', 'Salade'] },
  { nom: 'Saumon, riz et brocolis', emoji: '🐟', duree: '25 min', saison: 'toute', ingredients: ['Pavés de saumon', 'Riz', 'Brocolis', 'Citron'] },
  { nom: 'Risotto aux champignons', emoji: '🍄', duree: '35 min', saison: 'toute', vege: true, ingredients: ['Riz à risotto', 'Champignons', 'Oignon', 'Bouillon de légumes', 'Parmesan'] },
  { nom: 'Croque-monsieur et salade', emoji: '🥪', duree: '20 min', saison: 'toute', ingredients: ['Pain de mie', 'Jambon', 'Emmental', 'Salade'] },
  { nom: 'Poulet rôti et pommes de terre', emoji: '🍗', duree: '1 h 15', saison: 'toute', ingredients: ['Poulet entier', 'Pommes de terre', 'Ail', 'Thym'] },
  { nom: 'Couscous', emoji: '🥘', duree: '1 h 30', saison: 'froid', ingredients: ['Semoule', 'Poulet', 'Merguez', 'Carottes', 'Courgettes', 'Pois chiches'] },
  { nom: 'Wok de nouilles', emoji: '🍜', duree: '25 min', saison: 'toute', ingredients: ['Nouilles', 'Poivrons', 'Carottes', 'Brocolis', 'Sauce soja', 'Crevettes'] },
  { nom: 'Galettes complètes', emoji: '🫓', duree: '25 min', saison: 'toute', ingredients: ['Galettes de sarrasin', 'Jambon', 'Œufs', 'Emmental râpé', 'Salade'] },
  { nom: 'Gratin de pâtes au jambon', emoji: '🧀', duree: '35 min', saison: 'toute', ingredients: ['Coquillettes', 'Jambon', 'Crème fraîche', 'Emmental râpé'] },
  { nom: 'Poisson pané et purée', emoji: '🐠', duree: '25 min', saison: 'toute', ingredients: ['Poisson pané', 'Pommes de terre', 'Lait', 'Beurre'] },
  { nom: 'Salade niçoise', emoji: '🥗', duree: '20 min', saison: 'chaud', ingredients: ['Thon', 'Œufs', 'Tomates', 'Haricots verts', 'Olives', 'Salade'] },
  { nom: 'Ratatouille et riz', emoji: '🍆', duree: '1 h', saison: 'chaud', vege: true, ingredients: ['Aubergines', 'Courgettes', 'Poivrons', 'Tomates', 'Oignon', 'Riz'] },
  { nom: 'Barbecue', emoji: '🔥', duree: '30 min', saison: 'chaud', ingredients: ['Saucisses', 'Merguez', 'Brochettes', 'Salade', 'Tomates', 'Pain'] },
  { nom: 'Taboulé et poulet', emoji: '🥙', duree: '20 min', saison: 'chaud', ingredients: ['Semoule', 'Tomates', 'Concombre', 'Menthe', 'Citron', 'Blancs de poulet'] },
  { nom: 'Tomates farcies', emoji: '🍅', duree: '1 h', saison: 'chaud', ingredients: ['Tomates', 'Chair à saucisse', 'Oignon', 'Riz'] },
  { nom: 'Wraps frais', emoji: '🌯', duree: '15 min', saison: 'chaud', ingredients: ['Tortillas', 'Blancs de poulet', 'Crudités', 'Fromage frais'] },
]

function saisonDuMois(mois: number): ('froid' | 'chaud')[] {
  if (mois >= 9 || mois <= 2) return ['froid'] // octobre à mars
  if (mois >= 4 && mois <= 8) return ['chaud'] // mai à septembre
  return ['froid', 'chaud'] // avril
}

function semaineDeLAnnee(d: Date): number {
  const debut = new Date(d.getFullYear(), 0, 1)
  return Math.floor((d.getTime() - debut.getTime()) / (7 * 86_400_000))
}

function hacher(texte: string): number {
  let h = 2166136261
  for (let i = 0; i < texte.length; i++) {
    h ^= texte.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/**
 * Les idées de la semaine : les mêmes chez Simon et Romane, qui changent chaque semaine
 * et suivent la saison. « page » donne d'autres idées.
 */
export function ideesDeLaSemaine(page: number, combien = 4, date = new Date()): Repas[] {
  const saisons = saisonDuMois(date.getMonth())
  const semaine = semaineDeLAnnee(date)
  const possibles = REPAS.filter((r) => r.saison === 'toute' || saisons.includes(r.saison)).sort(
    (a, b) => hacher(`${semaine}-${a.nom}`) - hacher(`${semaine}-${b.nom}`),
  )
  const debut = (page * combien) % possibles.length
  return [...possibles, ...possibles].slice(debut, debut + combien)
}
