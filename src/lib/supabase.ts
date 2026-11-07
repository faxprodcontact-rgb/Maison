import { createClient } from '@supabase/supabase-js'
import { SUPABASE_CLE, SUPABASE_URL } from './config'

export const supabase = createClient(SUPABASE_URL, SUPABASE_CLE, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
})

/**
 * Les tables de l'app sont préfixées « maison_ » : elles partagent le projet Supabase
 * « Application Personnel » avec d'autres applications sans s'y mélanger.
 */
export const PREFIXE = 'maison_'

export function table(nom: string) {
  return supabase.from(PREFIXE + nom)
}
