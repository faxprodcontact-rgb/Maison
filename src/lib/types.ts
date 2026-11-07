export type Membre = {
  cle: string
  prenom: string
  couleur: string
  user_id: string | null
}

export type Article = {
  id: string
  nom: string
  quantite: string | null
  rayon: string
  coche: boolean
  ajoute_par: string | null
  cree_le: string
  coche_le: string | null
}

export type ArticleCatalogue = {
  nom_normalise: string
  nom: string
  rayon: string
  nb_achats: number
  dernier_achat: string | null
}

export type Repetition = 'aucune' | 'jour' | 'semaine' | 'mois' | 'annee'

export type Tache = {
  id: string
  titre: string
  qui: string | null
  echeance: string | null
  repetition: Repetition
  intervalle: number
  fait_le: string | null
  fait_par: string | null
  notes: string | null
  cree_le: string
}

export type Depense = {
  id: string
  montant: number
  libelle: string | null
  categorie: string
  paye_par: string
  pour: string | null
  le: string
  est_remboursement: boolean
  cree_le: string
}

export type Solde = {
  paye_par: string
  pour: string | null
  total: number
}

export type Entretien = {
  id: string
  titre: string
  categorie: string
  frequence_mois: number | null
  prochaine: string | null
  derniere: string | null
  notes: string | null
  cree_le: string
}

export type EntretienFait = {
  id: string
  entretien_id: string
  fait_le: string
  cout: number | null
  notes: string | null
  fait_par: string | null
  cree_le: string
}
