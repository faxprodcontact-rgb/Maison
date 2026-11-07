import { type FormEvent, useState } from 'react'
import { texteSur } from '../components/ui'
import { codeInvitation, oublierInvitation } from '../lib/invitation'
import { supabase } from '../lib/supabase'

type Place = { cle: string; prenom: string; couleur: string }

/** Écran affiché à un compte connecté qui ne fait pas encore partie du foyer. */
export function Rejoindre({ email, rejoint }: { email: string; rejoint: () => void }) {
  const [code, setCode] = useState(codeInvitation)
  const [places, setPlaces] = useState<Place[] | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(false)

  async function verifierCode(e: FormEvent) {
    e.preventDefault()
    setEnvoi(true)
    setErreur(null)
    const { data, error } = await supabase.rpc('maison_places_libres', { p_code: code })
    setEnvoi(false)
    if (error) return setErreur(error.message)
    setPlaces((data ?? []) as Place[])
  }

  async function choisir(place: Place) {
    setEnvoi(true)
    setErreur(null)
    const { error } = await supabase.rpc('maison_rejoindre', { p_code: code, p_cle: place.cle })
    setEnvoi(false)
    if (error) return setErreur(error.message)
    oublierInvitation()
    rejoint()
  }

  return (
    <main className="mx-auto max-w-sm px-6 pt-[calc(env(safe-area-inset-top)+4rem)] pb-10">
      <h1 className="titre-page">Rejoindre le foyer</h1>

      {places === null ? (
        <form onSubmit={verifierCode} className="mt-6">
          <p className="mb-6 text-encre-2">
            Vous êtes connecté avec <strong className="text-encre">{email}</strong>. Entrez le code du foyer pour relier ce
            compte à la maison.
          </p>
          <label className="mb-6 block">
            <span className="mb-2 block text-[0.9rem] font-semibold text-encre-2">Code du foyer</span>
            <input
              className="champ nombre !bg-surface text-[1.3rem] tracking-[0.12em] uppercase"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="XXXX-XXXX"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              required
            />
          </label>
          {erreur && (
            <p className="mb-4 text-retard" role="alert">
              {erreur}
            </p>
          )}
          <button type="submit" className="bouton bouton-principal w-full" disabled={envoi || !code.trim()}>
            {envoi ? 'Vérification…' : 'Continuer'}
          </button>
        </form>
      ) : places.length === 0 ? (
        <p className="mt-6 text-encre-2">Les deux places du foyer sont déjà prises.</p>
      ) : (
        <div className="mt-6">
          <p className="mb-5 text-[1.15rem] font-semibold">Qui êtes-vous ?</p>
          <div className="grid gap-3">
            {places.map((p) => (
              <button
                key={p.cle}
                type="button"
                disabled={envoi}
                onClick={() => void choisir(p)}
                className="flex items-center gap-4 rounded-2xl bg-surface px-4 py-4 text-left text-[1.2rem] font-semibold disabled:opacity-60"
              >
                <span
                  className="pastille"
                  aria-hidden="true"
                  style={{ width: 40, height: 40, fontSize: 18, background: p.couleur, color: texteSur(p.couleur) }}
                >
                  {p.prenom[0]}
                </span>
                Je suis {p.prenom}
              </button>
            ))}
          </div>
          {erreur && (
            <p className="mt-4 text-retard" role="alert">
              {erreur}
            </p>
          )}
        </div>
      )}

      <p className="mt-10 text-[0.9rem] text-encre-3">
        Connecté avec {email}.{' '}
        <button type="button" className="underline underline-offset-4" onClick={() => void supabase.auth.signOut()}>
          Changer de compte
        </button>
      </p>
    </main>
  )
}
