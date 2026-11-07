import { type FormEvent, useState } from 'react'
import { codeInvitation } from '../lib/invitation'
import { supabase } from '../lib/supabase'

type Mode = 'connexion' | 'inscription'

/** Ouverte depuis l'icône de l'écran d'accueil (et non dans le navigateur) */
const installee =
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true

export function Connexion() {
  // Le lien d'invitation propose de créer un compte, sauf dans l'app installée où l'on vient surtout se connecter
  const [mode, setMode] = useState<Mode>(() => (codeInvitation() && !installee ? 'inscription' : 'connexion'))
  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(false)
  const inscription = mode === 'inscription'

  function changerMode(m: Mode) {
    setMode(m)
    setErreur(null)
    setInfo(null)
  }

  async function valider(e: FormEvent) {
    e.preventDefault()
    setEnvoi(true)
    setErreur(null)
    setInfo(null)

    if (inscription) {
      const { data, error } = await supabase.auth.signUp({ email: email.trim(), password: motDePasse })
      setEnvoi(false)
      if (error) {
        if (/already registered|already exists/i.test(error.message)) {
          setErreur('Un compte existe déjà avec cet email. Connectez-vous.')
          setMode('connexion')
        } else if (/password/i.test(error.message)) {
          setErreur('Ce mot de passe est trop faible. Choisissez-en un plus long, avec des lettres et des chiffres.')
        } else {
          setErreur(`Création impossible : ${error.message}`)
        }
        return
      }
      if (!data.session) {
        setInfo('Compte créé. Ouvrez l’email de confirmation reçu, puis revenez ici vous connecter.')
        setMode('connexion')
      }
      return
    }

    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: motDePasse })
    setEnvoi(false)
    if (error) {
      setErreur(
        /invalid login/i.test(error.message)
          ? 'Email ou mot de passe incorrect.'
          : /not confirmed/i.test(error.message)
            ? 'Confirmez d’abord votre email avec le lien reçu.'
            : `Connexion impossible : ${error.message}`,
      )
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col px-6 pt-[calc(env(safe-area-inset-top)+5rem)] pb-10">
      <img src={`${import.meta.env.BASE_URL}icon-192.png`} alt="" className="size-16 rounded-[1.1rem]" />
      <h1 className="titre-page mt-6">Mervans</h1>
      <p className="mt-3 text-encre-2">Courses, tâches, budget et entretien de la maison, partagés entre vous deux.</p>

      <form onSubmit={valider} className="mt-10">
        <h2 className="mb-5 text-[1.3rem] font-semibold">{inscription ? 'Créer votre compte' : 'Connexion'}</h2>
        <label className="mb-4 block">
          <span className="mb-2 block text-[0.9rem] font-semibold text-encre-2">Email</span>
          <input
            className="champ !bg-surface"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="mb-6 block">
          <span className="mb-2 block text-[0.9rem] font-semibold text-encre-2">Mot de passe</span>
          <input
            className="champ !bg-surface"
            type="password"
            autoComplete={inscription ? 'new-password' : 'current-password'}
            minLength={inscription ? 8 : undefined}
            required
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
          />
          {inscription && <span className="mt-1.5 block text-[0.85rem] text-encre-3">8 caractères minimum.</span>}
        </label>
        {erreur && (
          <p className="mb-4 text-retard" role="alert">
            {erreur}
          </p>
        )}
        {info && (
          <p className="mb-4 font-semibold" role="status">
            {info}
          </p>
        )}
        <button type="submit" className="bouton bouton-principal w-full" disabled={envoi}>
          {envoi ? 'Un instant…' : inscription ? 'Créer mon compte' : 'Se connecter'}
        </button>
      </form>

      {installee && (
        <p className="mt-6 rounded-2xl bg-surface px-4 py-3 text-[0.92rem] text-encre-2">
          Sur l’écran d’accueil, Mervans garde sa propre connexion, à part de Safari ou Chrome. Connectez-vous une fois
          ici : l’app s’en souviendra ensuite.
        </p>
      )}

      <p className="mt-6 text-center text-encre-2">
        {inscription ? 'Vous avez déjà un compte ?' : 'Pas encore de compte ?'}{' '}
        <button
          type="button"
          className="font-semibold text-encre underline underline-offset-4"
          onClick={() => changerMode(inscription ? 'connexion' : 'inscription')}
        >
          {inscription ? 'Se connecter' : 'Créer un compte'}
        </button>
      </p>
    </main>
  )
}
