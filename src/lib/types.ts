export type Membre = {
  cle: string
  prenom: string
  couleur: string
  user_id: string | null
  notif_mots?: boolean
  notif_agenda?: boolean
  notif_matin?: boolean
  notif_taches?: boolean
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
  piece: string | null
  genre: GenreTache
  rappel_a?: string | null
  rappel_envoye_le?: string | null
  cree_par?: string | null
}

export type GenreTache = 'faire' | 'reparer' | 'acheter' | 'idee'

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
  rappel: string | null
  mois_conseille: number | null
  prevenir_jours: number
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

export type Importance = 'doux' | 'normal' | 'important'

export type Message = {
  id: string
  de: string
  texte: string
  importance: Importance
  cree_le: string
  lu_le: string | null
  reaction: string | null
  photo: string | null
}

export type TypeEvenement = 'sortie' | 'rdv' | 'sante' | 'famille' | 'anniversaire' | 'autre'
export type ImportanceEvenement = 'info' | 'normal' | 'important'

export type Evenement = {
  id: string
  titre: string
  le: string
  heure: string | null
  heure_fin: string | null
  type: TypeEvenement
  importance: ImportanceEvenement
  pour: string | null
  notes: string | null
  cree_par: string
  statut: 'confirme' | 'question' | 'refuse'
  question_a: string | null
  repondu_le: string | null
  annuel: boolean
  annee_naissance: number | null
  cree_le: string
}

export type Projet = {
  id: string
  genre: 'travaux' | 'envie'
  titre: string
  prix: number | null
  lien: string | null
  priorite: 'basse' | 'normale' | 'haute'
  notes: string | null
  fait: boolean
  fait_le: string | null
  cree_par: string | null
  cree_le: string
}

export type Menu = {
  id: string
  le: string
  moment: 'midi' | 'soir'
  titre: string
  emoji: string | null
  ajoute_par: string | null
  cree_le: string
}

export type CategorieDocument = 'facture' | 'garantie' | 'attestation' | 'contrat' | 'devis' | 'notice' | 'autre'

export type Document = {
  id: string
  titre: string
  categorie: CategorieDocument
  chemin: string
  type_mime: string | null
  taille: number | null
  lie_a: 'entretien' | 'projet' | null
  lie_id: string | null
  date_doc: string | null
  expire_le: string | null
  notes: string | null
  ajoute_par: string | null
  cree_le: string
}
