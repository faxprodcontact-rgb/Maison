import { type DependencyList, useCallback, useEffect, useRef, useState } from 'react'
import { PREFIXE, supabase } from './supabase'

type Reponse<T> = { data: T[] | null; error: { message: string } | null }

/**
 * Charge des lignes et les recharge dès qu'une des tables change
 * (sur ce téléphone ou sur l'autre), ou quand l'app revient au premier plan.
 */
export function useLive<T>(
  tables: string | string[],
  charger: () => PromiseLike<Reponse<T>>,
  deps: DependencyList = [],
) {
  const [lignes, setLignes] = useState<T[] | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const chargerRef = useRef(charger)
  chargerRef.current = charger
  const requete = useRef(0)

  const recharger = useCallback(async () => {
    const numero = ++requete.current
    const { data, error } = await chargerRef.current()
    if (numero !== requete.current) return
    if (error) setErreur(error.message)
    else {
      setErreur(null)
      setLignes(data ?? [])
    }
  }, [])

  // Rechargement quand les paramètres changent (par exemple le mois affiché)
  useEffect(() => {
    void recharger()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  const cleTables = Array.isArray(tables) ? tables.join(',') : tables

  useEffect(() => {
    let minuteur: ReturnType<typeof setTimeout> | undefined
    const planifier = () => {
      clearTimeout(minuteur)
      minuteur = setTimeout(() => void recharger(), 120)
    }
    const canal = supabase.channel(`live:${cleTables}:${Math.random().toString(36).slice(2)}`)
    for (const table of cleTables.split(',')) {
      canal.on('postgres_changes', { event: '*', schema: 'public', table: PREFIXE + table }, planifier)
    }
    canal.subscribe()

    const auRetour = () => {
      if (document.visibilityState === 'visible') planifier()
    }
    document.addEventListener('visibilitychange', auRetour)
    window.addEventListener('online', planifier)
    return () => {
      clearTimeout(minuteur)
      void supabase.removeChannel(canal)
      document.removeEventListener('visibilitychange', auRetour)
      window.removeEventListener('online', planifier)
    }
  }, [cleTables, recharger])

  return { lignes, setLignes, erreur, recharger }
}
