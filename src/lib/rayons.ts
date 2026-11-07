import {
  Bath,
  Beef,
  Candy,
  Carrot,
  Croissant,
  CupSoda,
  type LucideIcon,
  Milk,
  ShoppingBasket,
  Snowflake,
  Soup,
  SprayCan,
} from 'lucide-react'

export type Rayon = { cle: string; nom: string; icone: LucideIcon }

// Dans l'ordre d'un parcours de supermarché classique
export const RAYONS: Rayon[] = [
  { cle: 'fruits-legumes', nom: 'Fruits et légumes', icone: Carrot },
  { cle: 'boulangerie', nom: 'Boulangerie', icone: Croissant },
  { cle: 'boucherie', nom: 'Boucherie et poisson', icone: Beef },
  { cle: 'cremerie', nom: 'Crèmerie et œufs', icone: Milk },
  { cle: 'epicerie-salee', nom: 'Épicerie salée', icone: Soup },
  { cle: 'epicerie-sucree', nom: 'Épicerie sucrée', icone: Candy },
  { cle: 'boissons', nom: 'Boissons', icone: CupSoda },
  { cle: 'surgeles', nom: 'Surgelés', icone: Snowflake },
  { cle: 'hygiene', nom: 'Hygiène et beauté', icone: Bath },
  { cle: 'entretien', nom: 'Produits ménagers', icone: SprayCan },
  { cle: 'autre', nom: 'Autre', icone: ShoppingBasket },
]

export function rayon(cle: string): Rayon {
  return RAYONS.find((r) => r.cle === cle) ?? RAYONS[RAYONS.length - 1]
}

const MOTS: Record<string, string[]> = {
  'fruits-legumes': [
    'pomme', 'poire', 'banane', 'orange', 'citron', 'clementine', 'mandarine', 'kiwi', 'fraise',
    'framboise', 'raisin', 'melon', 'pasteque', 'ananas', 'mangue', 'avocat', 'tomate', 'salade',
    'laitue', 'mache', 'roquette', 'concombre', 'courgette', 'aubergine', 'poivron', 'carotte',
    'poireau', 'oignon', 'echalote', 'ail', 'pomme de terre', 'patate', 'champignon', 'brocoli',
    'chou', 'epinard', 'haricot vert', 'radis', 'betterave', 'celeri', 'persil', 'coriandre',
    'basilic', 'menthe', 'ciboulette', 'fenouil', 'courge', 'potiron', 'butternut', 'navet',
    'endive', 'artichaut', 'asperge', 'gingembre', 'pamplemousse', 'cerise', 'abricot', 'peche',
    'nectarine', 'prune', 'figue', 'myrtille', 'fruit', 'legume', 'patate douce', 'citron vert',
  ],
  boulangerie: [
    'pain', 'baguette', 'croissant', 'pain au chocolat', 'chocolatine', 'brioche', 'viennoiserie',
    'pain complet', 'ficelle', 'tradition',
  ],
  boucherie: [
    'viande', 'poulet', 'boeuf', 'steak', 'hache', 'porc', 'cote', 'jambon', 'saucisse', 'merguez',
    'lardon', 'agneau', 'veau', 'dinde', 'escalope', 'poisson', 'saumon', 'cabillaud', 'colin',
    'crevette', 'moule', 'roti', 'bacon', 'chorizo', 'saucisson', 'rillettes', 'cuisse', 'filet',
    'magret', 'canard', 'blanc de poulet', 'charcuterie', 'surimi',
  ],
  cremerie: [
    'lait', 'beurre', 'creme', 'creme fraiche', 'yaourt', 'yogourt', 'fromage', 'emmental', 'comte',
    'mozzarella', 'parmesan', 'chevre', 'camembert', 'oeuf', 'skyr', 'fromage blanc',
    'petit suisse', 'pate feuilletee', 'pate brisee', 'pate a pizza', 'gruyere', 'raclette', 'feta',
    'ricotta', 'mascarpone', 'brie', 'roquefort', 'reblochon', 'dessert', 'creme dessert',
  ],
  'epicerie-salee': [
    'pate', 'spaghetti', 'tagliatelle', 'coquillette', 'riz', 'huile', 'vinaigre', 'sel', 'poivre',
    'epice', 'moutarde', 'ketchup', 'mayonnaise', 'sauce', 'conserve', 'thon', 'sardine',
    'lentille', 'pois chiche', 'haricot', 'mais', 'semoule', 'quinoa', 'soupe', 'bouillon',
    'chips', 'cracker', 'aperitif', 'olive', 'cornichon', 'tomates pelees', 'coulis', 'concentre',
    'pesto', 'curry', 'paprika', 'cumin', 'herbes de provence', 'pain de mie', 'biscotte', 'wrap',
    'tortilla', 'nouille', 'puree',
  ],
  'epicerie-sucree': [
    'sucre', 'farine', 'chocolat', 'cafe', 'the', 'tisane', 'infusion', 'cereale', 'confiture',
    'miel', 'biscuit', 'gateau', 'compote', 'levure', 'nutella', 'pate a tartiner', 'cacao',
    'bonbon', 'muesli', 'flocons d avoine', 'vanille', 'madeleine', 'capsule', 'dosette', 'gaufre',
  ],
  boissons: [
    'eau', 'jus', 'soda', 'coca', 'biere', 'vin', 'champagne', 'sirop', 'limonade', 'cidre',
    'eau gazeuse', 'perrier', 'ice tea', 'lait d amande', 'lait d avoine', 'boisson', 'rose',
  ],
  surgeles: [
    'surgele', 'glace', 'frites', 'petits pois', 'poisson pane', 'glacon', 'sorbet', 'pizza',
    'nuggets', 'cordon bleu',
  ],
  hygiene: [
    'shampoing', 'shampooing', 'apres shampoing', 'gel douche', 'savon', 'dentifrice',
    'brosse a dents', 'deodorant', 'deo', 'coton', 'coton tige', 'papier toilette', 'pq',
    'mouchoir', 'rasoir', 'creme hydratante', 'serviette hygienique', 'tampon', 'protection',
    'couche', 'lingette', 'creme solaire', 'maquillage', 'demaquillant', 'fil dentaire',
  ],
  entretien: [
    'liquide vaisselle', 'eponge', 'lessive', 'adoucissant', 'javel', 'sac poubelle',
    'sacs poubelle', 'essuie tout', 'sopalin', 'nettoyant', 'detergent', 'pastilles lave vaisselle',
    'tablettes lave vaisselle', 'sel lave vaisselle', 'liquide de rincage', 'papier alu',
    'papier aluminium', 'film alimentaire', 'papier cuisson', 'ampoule', 'pile', 'vinaigre blanc',
    'bicarbonate', 'desodorisant', 'produit vaisselle', 'produit menager', 'serpilliere',
  ],
}

export function normaliser(texte: string): string {
  return texte
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/œ/g, 'oe')
    .replace(/['’-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const INDEX: { mot: string; rayon: string }[] = Object.entries(MOTS)
  .flatMap(([r, mots]) => mots.map((mot) => ({ mot: normaliser(mot), rayon: r })))
  .sort((a, b) => b.mot.length - a.mot.length)

/** Devine le rayon d'un article à partir de son nom (« 2 baguettes » → boulangerie). */
export function devinerRayon(nom: string): string {
  const n = ` ${normaliser(nom)}`
  for (const { mot, rayon: r } of INDEX) {
    if (n.includes(` ${mot}`)) return r
  }
  return 'autre'
}

/** Sépare une quantité saisie en tête : « 2 kg pommes » → { quantite: '2 kg', nom: 'pommes' }. */
export function separerQuantite(saisie: string): { nom: string; quantite: string | null } {
  const texte = saisie.trim().replace(/\s+/g, ' ')
  const m = texte.match(/^(\d+(?:[.,]\d+)?\s*(?:kg|g|l|cl|ml|x)?)\s+(?:de |d')?(.+)$/i)
  if (m) return { quantite: m[1].replace(/\s+/g, ' '), nom: m[2] }
  return { nom: texte, quantite: null }
}
