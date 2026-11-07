import { type FormEvent, useState } from 'react'
import { supabase } from '../lib/supabase'

export function Connexion() {
  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(false)

  async function seConnecter(e: FormEvent) {
    e.preventDefault()
    setEnvoi(true)
    setErreur(null)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: motDePasse })
    setEnvoi(false)
    if (error) {
      setErreur(
        error.message.includes('Invalid login')
          ? 'Email ou mot de passe incorrect.'
          : `Connexion impossible : ${error.message}`,
      )
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col px-6 pt-[calc(env(safe-area-inset-top)+5rem)] pb-10">
      <img src="/icon-192.png" alt="" className="size-16 rounded-[1.1rem]" />
      <h1 className="titre-page mt-6">Maison</h1>
      <p className="mt-3 text-encre-2">Courses, tâches, budget et entretien, partagés entre vous deux.</p>

      <form onSubmit={seConnecter} className="mt-10">
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
            autoComplete="current-password"
            required
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
          />
        </label>
        {erreur && (
          <p className="mb-4 text-retard" role="alert">
            {erreur}
          </p>
        )}
        <button type="submit" className="bouton bouton-principal w-full" disabled={envoi}>
          {envoi ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>
    </main>
  )
}
