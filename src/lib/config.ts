// Adresse et clé publique du projet Supabase.
// La clé « publishable » est faite pour être utilisée dans l'app : les données
// restent protégées par les règles d'accès de la base (seuls les membres du foyer).
export const SUPABASE_URL: string =
  import.meta.env.VITE_SUPABASE_URL ?? 'https://A_REMPLACER.supabase.co'

export const SUPABASE_CLE: string =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? 'A_REMPLACER'
