import type { KeyboardEvent } from 'react'
import { PIECES_PLAN, type Piece } from '../lib/pieces'

/**
 * Plan de l'étage, simplifié d'après la carte du robot aspirateur.
 * Chaque pièce est un bouton : on la touche pour voir et ajouter ce qu'il y a à y faire.
 */
const FORMES: Record<string, { points: string; label: [number, number] }> = {
  salon: { points: '6,6 314,6 314,96 220,96 220,146 146,146 146,200 6,200', label: [112, 62] },
  cuisine: { points: '220,96 304,96 304,196 220,196', label: [254, 150] },
  couloir: { points: '146,146 220,146 220,322 146,322', label: [183, 238] },
  'chambre-amis': { points: '6,200 146,200 146,316 6,316', label: [52, 264] },
  'salle-de-bains': { points: '220,196 314,196 314,322 220,322', label: [267, 259] },
  chambre: { points: '6,316 180,316 180,434 6,434', label: [128, 382] },
  dressing: { points: '180,322 304,322 304,428 180,428', label: [242, 375] },
}

// Passages entre les pièces (dessinés comme des ouvertures dans les murs)
const PORTES: [number, number, number, number][] = [
  [142, 272, 8, 28],
  [216, 272, 8, 28],
  [152, 312, 24, 8],
  [186, 318, 28, 8],
  [216, 106, 8, 28],
]

export function PlanMaison({
  compteurs,
  ouvrir,
}: {
  compteurs: Record<string, number>
  ouvrir: (p: Piece) => void
}) {
  function toucheClavier(e: KeyboardEvent, p: Piece) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      ouvrir(p)
    }
  }

  return (
    <svg viewBox="0 0 320 440" className="plan block w-full" role="group" aria-label="Plan de la maison">
      {PIECES_PLAN.map((p) => {
        const f = FORMES[p.cle]
        const n = compteurs[p.cle] ?? 0
        const [x, y] = f.label
        const nom = p.court ?? p.nom
        return (
          <g
            key={p.cle}
            className="piece"
            role="button"
            tabIndex={0}
            aria-label={`${p.nom}, ${n === 0 ? 'rien à faire' : `${n} chose${n > 1 ? 's' : ''} à faire`}`}
            onClick={() => ouvrir(p)}
            onKeyDown={(e) => toucheClavier(e, p)}
          >
            <polygon points={f.points} fill={p.couleur} stroke="var(--surface)" strokeWidth="7" strokeLinejoin="round" />
            <g transform={`translate(${x} ${y})`} aria-hidden="true">
              <p.icone x={-9} y={-24} width={18} height={18} color="var(--encre)" strokeWidth={2} />
              <text y="8" textAnchor="middle" fontSize={nom.length > 10 ? 11.5 : 13} fontWeight="650" fill="var(--encre)">
                {nom}
              </text>
              {n > 0 && (
                <g transform="translate(17 -22)">
                  <circle r="10" fill="var(--encre)" />
                  <text y="4" textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--fond)">
                    {n}
                  </text>
                </g>
              )}
            </g>
          </g>
        )
      })}

      {/* Meubles, juste pour se repérer */}
      <g className="meubles" pointerEvents="none" fill="none" stroke="var(--encre-3)" strokeWidth="1.6" opacity=".45" aria-hidden="true">
        <path d="M24 86 h70 v14 h-56 v58 h-14 z" />
        <rect x="52" y="110" width="40" height="26" rx="4" />
        <rect x="240" y="26" width="56" height="32" rx="6" />
        <circle cx="252" cy="20" r="4" />
        <circle cx="284" cy="20" r="4" />
        <circle cx="252" cy="64" r="4" />
        <circle cx="284" cy="64" r="4" />
        <rect x="284" y="104" width="14" height="84" rx="2" />
        <rect x="94" y="214" width="42" height="60" rx="5" />
        <path d="M100 222 h30" />
        <rect x="16" y="332" width="66" height="90" rx="6" />
        <path d="M22 342 h24 M52 342 h24" />
        <rect x="286" y="206" width="22" height="54" rx="9" />
        <path d="M188 340 h104 M188 352 h104" />
      </g>

      <g fill="var(--piece-couloir)" pointerEvents="none" aria-hidden="true">
        {PORTES.map(([x, y, w, h]) => (
          <rect key={`${x}-${y}`} x={x} y={y} width={w} height={h} rx="2" />
        ))}
      </g>
    </svg>
  )
}
