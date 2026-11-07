import { createContext, type ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react'

type Message = { id: number; texte: string; action?: { libelle: string; faire: () => void } }
type Afficher = (texte: string, action?: Message['action']) => void

const ToastContext = createContext<Afficher>(() => {})

export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<Message | null>(null)
  const minuteur = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const afficher = useCallback<Afficher>((texte, action) => {
    clearTimeout(minuteur.current)
    setMessage({ id: Date.now(), texte, action })
    minuteur.current = setTimeout(() => setMessage(null), action ? 6000 : 3500)
  }, [])

  useEffect(() => () => clearTimeout(minuteur.current), [])

  return (
    <ToastContext.Provider value={afficher}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 z-50 flex justify-center px-4"
        style={{ bottom: 'calc(var(--hauteur-nav) + env(safe-area-inset-bottom) + 5.5rem)' }}
        aria-live="polite"
      >
        {message && (
          <div
            key={message.id}
            className="toast pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl bg-encre px-4 py-3 text-fond shadow-lg"
          >
            <span className="flex-1 text-[0.95rem]">{message.texte}</span>
            {message.action && (
              <button
                type="button"
                className="rounded-lg px-2 py-1 font-semibold underline underline-offset-4"
                onClick={() => {
                  message.action?.faire()
                  setMessage(null)
                }}
              >
                {message.action.libelle}
              </button>
            )}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  )
}
