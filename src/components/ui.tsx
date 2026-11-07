import { Plus } from 'lucide-react'
import type { ReactNode } from 'react'
import { useFoyer } from '../lib/foyer'

/**
 * Pastille d'une personne, ou des deux quand cle est null.
 * C'est le repère visuel de toute l'app : la couleur de Simon, celle de Romane,
 * et les deux côte à côte pour « nous deux ».
 */
export function Pastille({ cle, taille = 22 }: { cle: string | null | undefined; taille?: number }) {
  const { membres, membre } = useFoyer()
  const style = (couleur: string | undefined) => ({
    width: taille,
    height: taille,
    fontSize: taille * 0.5,
    background: couleur ?? 'var(--encre-3)',
    color: texteSur(couleur),
  })
  if (!cle) {
    const [a, b] = membres
    return (
      <span role="img" className="relative inline-flex shrink-0" style={{ width: taille * 1.55, height: taille }} aria-label="Nous deux">
        <span className="pastille absolute left-0" style={style(a?.couleur)} aria-hidden="true">
          {a?.prenom[0]}
        </span>
        <span className="pastille absolute right-0" style={style(b?.couleur)} aria-hidden="true">
          {b?.prenom[0]}
        </span>
      </span>
    )
  }
  const m = membre(cle)
  return (
    <span role="img" className="pastille shrink-0" style={style(m?.couleur)} aria-label={m?.prenom ?? 'Inconnu'}>
      <span aria-hidden="true">{m?.prenom[0] ?? '?'}</span>
    </span>
  )
}

/** Texte blanc ou foncé selon ce qui se lit le mieux sur la couleur donnée. */
export function texteSur(couleur: string | undefined): string {
  const hex = /^#([0-9a-f]{6})$/i.exec(couleur ?? '')?.[1]
  if (!hex) return '#ffffff'
  const canal = (i: number) => {
    const c = Number.parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  const l = 0.2126 * canal(0) + 0.7152 * canal(2) + 0.0722 * canal(4)
  const contrasteBlanc = 1.05 / (l + 0.05)
  const contrasteFonce = (l + 0.05) / 0.0627
  return contrasteBlanc >= contrasteFonce ? '#ffffff' : '#17221e'
}

export function nomPersonne(prenom: string | undefined, cle: string | null) {
  return cle ? (prenom ?? '?') : 'Nous deux'
}

export function TitrePage({ children, apres }: { children: ReactNode; apres?: ReactNode }) {
  return (
    <header className="flex items-end gap-3 px-5 pt-[calc(env(safe-area-inset-top)+1.75rem)] pb-4">
      <h1 className="titre-page flex-1">{children}</h1>
      {apres}
    </header>
  )
}

export function BoutonAjouter({ onClick, libelle }: { onClick: () => void; libelle: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={libelle}
      className="fixed right-[max(1.25rem,calc(50vw-17.5rem+1.25rem))] z-30 grid size-15 place-items-center rounded-full bg-encre text-fond shadow-[0_6px_20px_-6px_rgb(0_0_0/0.45)] active:scale-95"
      style={{ bottom: 'calc(var(--hauteur-nav) + env(safe-area-inset-bottom) + 1rem)' }}
    >
      <Plus size={28} strokeWidth={2.25} />
    </button>
  )
}

export function Section({ titre, apres, children, ton }: { titre: ReactNode; apres?: ReactNode; children: ReactNode; ton?: 'retard' | 'bientot' }) {
  const couleur = ton === 'retard' ? 'text-retard' : ton === 'bientot' ? 'text-bientot' : 'text-encre-2'
  return (
    <section className="mt-6 first:mt-0">
      <div className="flex items-baseline gap-2 px-5 pb-2">
        <h2 className={`flex-1 text-[0.95rem] font-semibold ${couleur}`}>{titre}</h2>
        {apres}
      </div>
      {children}
    </section>
  )
}

export function Liste({ children }: { children: ReactNode }) {
  return <ul className="liste mx-3 overflow-hidden rounded-2xl bg-surface">{children}</ul>
}

type Option<T extends string> = { valeur: T; libelle: ReactNode }

export function Choix<T extends string>({
  options,
  valeur,
  changer,
  etiquette,
}: {
  options: Option<T>[]
  valeur: T
  changer: (v: T) => void
  etiquette: string
}) {
  return (
    <div role="radiogroup" aria-label={etiquette} className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.valeur}
          type="button"
          role="radio"
          aria-checked={valeur === o.valeur}
          onClick={() => changer(o.valeur)}
          className="puce"
        >
          {o.libelle}
        </button>
      ))}
    </div>
  )
}

export function Champ({ etiquette, children, aide }: { etiquette: string; children: ReactNode; aide?: ReactNode }) {
  return (
    <label className="mb-5 block">
      <span className="mb-2 block text-[0.9rem] font-semibold text-encre-2">{etiquette}</span>
      {children}
      {aide && <span className="mt-1.5 block text-[0.85rem] text-encre-3">{aide}</span>}
    </label>
  )
}

export function Groupe({ etiquette, children }: { etiquette: string; children: ReactNode }) {
  return (
    <fieldset className="mb-5">
      <legend className="mb-2 block text-[0.9rem] font-semibold text-encre-2">{etiquette}</legend>
      {children}
    </fieldset>
  )
}

export function Vide({ titre, children }: { titre: string; children?: ReactNode }) {
  return (
    <div className="px-5 py-8">
      <p className="text-[1.35rem] leading-snug font-semibold tracking-tight">{titre}</p>
      {children && <div className="mt-3 text-encre-2">{children}</div>}
    </div>
  )
}

export function Chargement() {
  return (
    <div className="px-5 py-10 text-encre-3" role="status">
      Chargement…
    </div>
  )
}

export function Erreur({ message }: { message: string }) {
  return (
    <div className="mx-3 rounded-2xl bg-surface px-4 py-3 text-retard" role="alert">
      Impossible de charger les données : {message}
    </div>
  )
}
