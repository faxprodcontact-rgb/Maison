import { createContext, useContext } from 'react'
import type { Membre } from './types'

export type Foyer = {
  membres: Membre[]
  moi: Membre
  autre: Membre
  email: string
  membre: (cle: string | null | undefined) => Membre | undefined
}

export const FoyerContext = createContext<Foyer | null>(null)

export function useFoyer(): Foyer {
  const foyer = useContext(FoyerContext)
  if (!foyer) throw new Error('useFoyer doit être utilisé dans le foyer')
  return foyer
}
