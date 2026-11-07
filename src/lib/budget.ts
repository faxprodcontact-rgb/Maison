import type { Solde } from './types'

/**
 * Ce que b doit à a (négatif si c'est a qui doit à b).
 * Une dépense partagée compte pour moitié, une dépense faite pour l'autre compte en entier,
 * un remboursement est une dépense « pour » celui qui reçoit l'argent.
 */
export function calculerSolde(soldes: Solde[], a: string, b: string): number {
  let net = 0
  for (const s of soldes) {
    const total = Number(s.total)
    const autre = s.paye_par === a ? b : a
    const du = s.pour === null ? total / 2 : s.pour === autre ? total : 0
    if (s.paye_par === a) net += du
    else if (s.paye_par === b) net -= du
  }
  return Math.round(net * 100) / 100
}
