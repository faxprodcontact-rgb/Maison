import { createClient } from '@supabase/supabase-js'
import { SUPABASE_CLE, SUPABASE_URL } from './config'

export const supabase = createClient(SUPABASE_URL, SUPABASE_CLE, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    // Fuze Arena est publié à la même adresse (faxprodcontact-rgb.github.io) avec le même projet Supabase :
    // sans clé à part, Mervans reprendrait la connexion du jeu.
    storageKey: 'mervans-connexion',
  },
})

/**
 * Les tables de l'app sont préfixées « maison_ » : elles partagent le projet Supabase
 * « Application Personnel » avec d'autres applications sans s'y mélanger.
 * VITE_PREFIXE=essai_ fait tourner l'app sur une copie de test isolée.
 */
export const PREFIXE: string = import.meta.env.VITE_PREFIXE ?? 'maison_'

export function table(nom: string) {
  return supabase.from(PREFIXE + nom)
}

export function rpc(nom: string, args: Record<string, unknown>) {
  return supabase.rpc(PREFIXE + nom, args)
}
