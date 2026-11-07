// Adresse et clé publique du projet Supabase « Application Personnel ».
// La clé « publishable » est faite pour être utilisée dans l'app : les données
// restent protégées par les règles d'accès de la base (seuls les membres du foyer).
export const SUPABASE_URL: string =
  import.meta.env.VITE_SUPABASE_URL ?? 'https://wikrrdtmxckgyfgyvvhr.supabase.co'

export const SUPABASE_CLE: string =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? 'sb_publishable_XczmNmm3A0REnaD7QCs5aA_yBEX6KVY'
