import { X } from 'lucide-react'
import { type ReactNode, useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'

type Props = {
  ouvert: boolean
  fermer: () => void
  titre: string
  children: ReactNode
}

/** Panneau qui monte du bas de l'écran, pour les formulaires. */
export function Sheet({ ouvert, fermer, titre, children }: Props) {
  const idTitre = useId()
  const panneau = useRef<HTMLDivElement>(null)
  const fermerRef = useRef(fermer)
  fermerRef.current = fermer

  useEffect(() => {
    if (!ouvert) return
    const precedent = document.activeElement as HTMLElement | null
    const touche = (e: KeyboardEvent) => {
      if (e.key === 'Escape') fermerRef.current()
    }
    document.addEventListener('keydown', touche)
    document.body.style.overflow = 'hidden'
    panneau.current?.focus()
    return () => {
      document.removeEventListener('keydown', touche)
      document.body.style.overflow = ''
      precedent?.focus?.()
    }
  }, [ouvert])

  if (!ouvert) return null

  return createPortal(
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <div className="voile absolute inset-0 bg-black/40" onClick={fermer} aria-hidden="true" />
      <div
        ref={panneau}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitre}
        tabIndex={-1}
        className="panneau relative flex max-h-[92dvh] w-full max-w-xl flex-col rounded-t-[1.75rem] bg-surface outline-none"
      >
        <div className="flex items-center gap-3 px-5 pt-5 pb-2">
          <h2 id={idTitre} className="flex-1 text-[1.45rem] leading-tight font-bold tracking-tight">
            {titre}
          </h2>
          <button
            type="button"
            onClick={fermer}
            className="-mr-2 grid size-10 place-items-center rounded-full text-encre-2 hover:bg-surface-2"
            aria-label="Fermer"
          >
            <X size={22} />
          </button>
        </div>
        <div className="overflow-y-auto px-5 pt-2 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
