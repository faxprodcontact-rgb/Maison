import { useId } from 'react'

export type Moment = 'aube' | 'jour' | 'soir' | 'nuit'

export function momentDeLaJournee(date = new Date()): Moment {
  const h = date.getHours()
  if (h >= 6 && h < 9) return 'aube'
  if (h >= 9 && h < 17) return 'jour'
  if (h >= 17 && h < 20) return 'soir'
  return 'nuit'
}

const AMBIANCES: Record<
  Moment,
  {
    ciel: [string, string, string]
    astre: { x: number; y: number; r: number; couleur: string; halo: string }
    lointain: string
    pelouse: string
    pelouseOmbre: string
    allee: string
    mur: string
    gris: string
    toit: string
    vitre: string
    allume: boolean
    texte: string
  }
> = {
  aube: {
    ciel: ['#8FB0DC', '#E7C1C4', '#F8D3A8'],
    astre: { x: 70, y: 150, r: 18, couleur: '#FFE7B0', halo: '#FFE7B0' },
    lointain: '#B9C9B0',
    pelouse: '#9DBB80',
    pelouseOmbre: '#89AA6D',
    allee: '#D7D2CB',
    mur: '#F7F5F2',
    gris: '#B8BCC1',
    toit: '#4E4743',
    vitre: '#5B6878',
    allume: true,
    texte: '#1E2A36',
  },
  jour: {
    ciel: ['#5FA8E6', '#9ACBF0', '#DCEFFB'],
    astre: { x: 342, y: 54, r: 17, couleur: '#FFD95A', halo: '#FFF1B8' },
    lointain: '#B5D3A3',
    pelouse: '#92C072',
    pelouseOmbre: '#7DAE5F',
    allee: '#D9D6D0',
    mur: '#FBFBFA',
    gris: '#B7BCC1',
    toit: '#4B4541',
    vitre: '#3E4C5C',
    allume: false,
    texte: '#13304A',
  },
  soir: {
    ciel: ['#4E4F97', '#C97C97', '#F6B37A'],
    astre: { x: 330, y: 160, r: 20, couleur: '#FFB46B', halo: '#FFB46B' },
    lointain: '#7C8A86',
    pelouse: '#6F8E58',
    pelouseOmbre: '#5F7D4B',
    allee: '#B9AFAA',
    mur: '#F1E5DE',
    gris: '#A9A6AB',
    toit: '#3D3735',
    vitre: '#4A4F66',
    allume: true,
    texte: '#FFFFFF',
  },
  nuit: {
    ciel: ['#0E1A36', '#1D2E57', '#33497A'],
    astre: { x: 334, y: 58, r: 14, couleur: '#F4EED6', halo: '#9FB3E0' },
    lointain: '#1D2B45',
    pelouse: '#2C4334',
    pelouseOmbre: '#25392C',
    allee: '#4A5263',
    mur: '#C7CEDA',
    gris: '#8C94A3',
    toit: '#2B2827',
    vitre: '#2C3546',
    allume: true,
    texte: '#FFFFFF',
  },
}

export function couleurTexteSurCiel(moment: Moment) {
  return AMBIANCES[moment].texte
}

/**
 * La maison de Simon et Romane, dessinée d'après la photo : toit en croupe, balcon avec l'olivier,
 * volets roulants, entrée vitrée et porte de garage. Le ciel suit l'heure de la journée.
 */
export function MaisonDessin({
  moment,
  className,
  cadrage = 'large',
}: {
  moment: Moment
  className?: string
  cadrage?: 'large' | 'carre'
}) {
  const id = useId().replace(/:/g, '')
  const a = AMBIANCES[moment]
  const lumiere = '#FFD47E'
  const viewBox = cadrage === 'carre' ? '52 36 296 296' : '0 0 400 300'

  return (
    <svg viewBox={viewBox} className={className} role="img" aria-label="Notre maison" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id={`${id}ciel`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={a.ciel[0]} />
          <stop offset=".6" stopColor={a.ciel[1]} />
          <stop offset="1" stopColor={a.ciel[2]} />
        </linearGradient>
        <radialGradient id={`${id}halo`}>
          <stop offset="0" stopColor={a.astre.halo} stopOpacity=".7" />
          <stop offset="1" stopColor={a.astre.halo} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}lueur`}>
          <stop offset="0" stopColor={lumiere} stopOpacity=".55" />
          <stop offset="1" stopColor={lumiere} stopOpacity="0" />
        </radialGradient>
        <mask id={`${id}croissant`}>
          <rect width="400" height="300" fill="#FFFFFF" />
          <circle cx={a.astre.x + 7} cy={a.astre.y - 5} r={a.astre.r * 0.85} fill="#000000" />
        </mask>
        <linearGradient id={`${id}toit`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={a.toit} />
          <stop offset="1" stopColor={a.toit} stopOpacity=".88" />
        </linearGradient>
      </defs>

      {/* Ciel */}
      <rect width="400" height="300" fill={`url(#${id}ciel)`} />
      <circle cx={a.astre.x} cy={a.astre.y} r={a.astre.r * 3.2} fill={`url(#${id}halo)`} />
      <circle
        cx={a.astre.x}
        cy={a.astre.y}
        r={a.astre.r}
        fill={a.astre.couleur}
        mask={moment === 'nuit' ? `url(#${id}croissant)` : undefined}
      />
      {moment === 'nuit' && (
        <>
          <g fill="#FFFFFF">
            {[
              [40, 40, 1.4],
              [92, 70, 1],
              [150, 28, 1.6],
              [210, 58, 1],
              [262, 22, 1.3],
              [300, 92, 1],
              [372, 120, 1.4],
              [28, 118, 1],
              [120, 110, 0.9],
            ].map(([x, y, r]) => (
              <circle key={`${x}-${y}`} cx={x} cy={y} r={r} opacity=".85" />
            ))}
          </g>
        </>
      )}
      {moment === 'jour' && (
        <g fill="#FFFFFF" opacity=".85">
          <ellipse cx="86" cy="62" rx="30" ry="10" />
          <ellipse cx="108" cy="56" rx="20" ry="11" />
          <ellipse cx="236" cy="38" rx="22" ry="7" />
          <ellipse cx="252" cy="34" rx="14" ry="8" />
        </g>
      )}

      {/* Au loin : voisins et arbres */}
      <g fill={a.lointain}>
        <path d="M0 214 V176 L22 162 L52 176 V214 Z" />
        <path d="M346 214 V182 L372 166 L400 180 V214 Z" />
        <circle cx="62" cy="188" r="16" />
        <circle cx="78" cy="196" r="12" />
        <circle cx="336" cy="194" r="13" />
        <rect x="0" y="198" width="400" height="20" />
      </g>

      {/* Pelouse et allée */}
      <rect y="214" width="400" height="160" fill={a.pelouse} />
      <path d="M0 236 C 90 226 180 232 270 228 L 270 374 H 0 Z" fill={a.pelouseOmbre} opacity=".5" />
      <path d="M270 250 H 322 L 400 290 V 374 H 300 Z" fill={a.allee} />

      {/* Maison */}
      <g>
        {/* Toit en croupe */}
        <path d="M66 141 L 334 141 L 298 106 L 102 106 Z" fill={`url(#${id}toit)`} />
        <path d="M102 106 H 298" stroke="#FFFFFF" strokeOpacity=".12" strokeWidth="2" />
        <rect x="188" y="99" width="7" height="9" rx="1" fill={a.toit} />
        <rect x="64" y="139" width="272" height="5" rx="2" fill="#E6E9EC" opacity=".95" />

        {/* Murs */}
        <rect x="80" y="144" width="240" height="106" fill={a.mur} />
        {/* Parties grises de l'enduit */}
        <rect x="100" y="187" width="98" height="63" fill={a.gris} />
        <rect x="106" y="146" width="92" height="6" fill={a.gris} />
        <rect x="235" y="150" width="75" height="7" fill={a.gris} />
        <rect x="235" y="180" width="75" height="20" fill={a.gris} />

        {/* Étage gauche : grandes fenêtres, volets roulants */}
        {[108, 154].map((x) => (
          <g key={x}>
            <rect x={x} y="153" width="42" height="30" fill={a.vitre} />
            <rect x={x} y="153" width="42" height={moment === 'nuit' ? 26 : 22} fill="#F2F3F4" />
            {[157, 161, 165, 169, 173, 177].map((y) =>
              y < 153 + (moment === 'nuit' ? 26 : 22) ? (
                <path key={y} d={`M${x} ${y} h42`} stroke="#D3D7DB" strokeWidth=".8" />
              ) : null,
            )}
            {a.allume && moment !== 'nuit' && <rect x={x + 3} y="176" width="36" height="6" fill={lumiere} opacity=".75" />}
            {moment === 'nuit' && <rect x={x + 3} y="179" width="36" height="3" fill={lumiere} opacity=".85" />}
          </g>
        ))}

        {/* Balcon */}
        <rect x="98" y="183" width="106" height="5" fill="#9DA3A9" />
        <g stroke="#5B6268" strokeWidth="1.1">
          <path d="M100 166 H 204" strokeWidth="1.6" />
          {Array.from({ length: 21 }, (_, i) => 101 + i * 5).map((x) => (
            <path key={x} d={`M${x} 166 V 183`} />
          ))}
        </g>
        {/* Olivier en pot */}
        <rect x="102" y="174" width="9" height="9" rx="1.5" fill="#3E3A38" />
        <path d="M106.5 174 V 160" stroke="#6B5A45" strokeWidth="1.4" />
        <circle cx="106.5" cy="156" r="8" fill="#6F8F55" />
        <circle cx="102" cy="159" r="4.5" fill="#7E9E62" />
        <circle cx="111" cy="153" r="4" fill="#5F7E48" />

        {/* Rez-de-chaussée gauche : deux petites fenêtres */}
        {[
          [106, 199],
          [150, 201],
        ].map(([x, y]) => (
          <g key={x}>
            {a.allume && <circle cx={x + 13} cy={y + 9} r="22" fill={`url(#${id}lueur)`} />}
            <rect x={x - 1.5} y={y - 1.5} width="29" height="21" fill="#FFFFFF" />
            <rect x={x} y={y} width="26" height="18" fill={a.allume ? lumiere : a.vitre} />
            <path d={`M${x + 13} ${y} v18`} stroke="#FFFFFF" strokeWidth="1.5" />
            {!a.allume && <path d={`M${x + 2} ${y + 14} l8 -11`} stroke="#FFFFFF" strokeOpacity=".25" strokeWidth="2" />}
          </g>
        ))}

        {/* Étage droit : deux fenêtres, volets roulants */}
        {[
          [238, 26],
          [270, 37],
        ].map(([x, w]) => (
          <g key={x}>
            <rect x={x} y="158" width={w} height="20" fill={a.vitre} />
            <rect x={x} y="158" width={w} height="17" fill="#F2F3F4" />
            {[161, 165, 169, 173].map((y) => (
              <path key={y} d={`M${x} ${y} h${w}`} stroke="#D3D7DB" strokeWidth=".8" />
            ))}
            {a.allume && <rect x={x + 2} y="175.5" width={w - 4} height="2.5" fill={lumiere} opacity=".85" />}
          </g>
        ))}

        {/* Entrée : porte vitrée et panneau latéral */}
        {a.allume && <circle cx="250" cy="226" r="26" fill={`url(#${id}lueur)`} />}
        <rect x="236" y="203" width="15" height="47" fill="#FBFBFA" stroke="#C9CDD1" strokeWidth=".8" />
        {[208, 215, 222, 229].map((y) => (
          <rect key={y} x="242.5" y={y} width="2.2" height="5" rx="1" fill={a.allume ? lumiere : '#59626E'} />
        ))}
        <rect x="252" y="203" width="9" height="47" fill={a.allume ? '#F6DCA0' : '#B9C6D0'} stroke="#C9CDD1" strokeWidth=".8" />
        {/* Applique */}
        {a.allume && <circle cx="265" cy="209" r="10" fill={`url(#${id}lueur)`} />}
        <circle cx="265" cy="209" r="2.6" fill={a.allume ? '#FFE9B5' : '#F4F4F2'} stroke="#C9CDD1" strokeWidth=".6" />

        {/* Porte de garage */}
        <rect x="269" y="203" width="40" height="47" fill="#FAFAF9" stroke="#C9CDD1" strokeWidth=".8" />
        {[211, 219, 227, 235, 243].map((y) => (
          <path key={y} d={`M269 ${y} h40`} stroke="#DADDE0" strokeWidth=".9" />
        ))}

        {/* Descente de gouttière */}
        <rect x="316" y="144" width="2.4" height="106" fill="#D9DCDF" />
        {/* Socle */}
        <rect x="80" y="248" width="240" height="3" fill="#000000" opacity=".08" />
      </g>

      {/* Boîte aux lettres */}
      <rect x="350" y="242" width="2" height="16" fill="#6B6F73" />
      <rect x="343" y="232" width="16" height="12" rx="1.5" fill="#2F5D4B" />
      <rect x="346" y="236" width="10" height="1.4" fill="#FFFFFF" opacity=".7" />
    </svg>
  )
}
