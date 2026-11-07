import type { Session } from '@supabase/supabase-js'
import { useEffect, useMemo, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Navigation } from './components/Navigation'
import { Chargement } from './components/ui'
import { type Foyer, FoyerContext } from './lib/foyer'
import { supabase, table } from './lib/supabase'
import type { Membre } from './lib/types'
import { useLive } from './lib/useLive'
import { Accueil } from './pages/Accueil'
import { Budget } from './pages/Budget'
import { Connexion } from './pages/Connexion'
import { Courses } from './pages/Courses'
import { Entretien } from './pages/Entretien'
import { Reglages } from './pages/Reglages'
import { Rejoindre } from './pages/Rejoindre'
import { Taches } from './pages/Taches'

export function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_evenement, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  if (session === undefined) return <Chargement />
  if (!session) return <Connexion />
  return <Maison session={session} />
}

function Maison({ session }: { session: Session }) {
  const { lignes: membres, erreur, recharger } = useLive<Membre>('membres', () =>
    table('membres').select('cle, prenom, couleur, user_id').order('cle', { ascending: false }),
  )

  const foyer = useMemo<Foyer | null>(() => {
    if (!membres) return null
    const moi = membres.find((m) => m.user_id === session.user.id)
    const autre = membres.find((m) => m.cle !== moi?.cle)
    if (!moi || !autre) return null
    return {
      membres,
      moi,
      autre,
      email: session.user.email ?? '',
      membre: (cle) => membres.find((m) => m.cle === cle),
    }
  }, [membres, session])

  if (!membres && !erreur) return <Chargement />

  if (erreur && !membres) {
    return (
      <main className="mx-auto max-w-md px-6 pt-[calc(env(safe-area-inset-top)+4rem)]">
        <h1 className="titre-page">Connexion au foyer impossible</h1>
        <p className="mt-4 text-retard">{erreur}</p>
        <button type="button" className="bouton bouton-principal mt-8" onClick={() => void recharger()}>
          Réessayer
        </button>
      </main>
    )
  }

  if (!foyer) return <Rejoindre email={session.user.email ?? ''} rejoint={() => void recharger()} />

  return (
    <FoyerContext.Provider value={foyer}>
      <main className="mx-auto max-w-xl pb-[calc(var(--hauteur-nav)+env(safe-area-inset-bottom)+6rem)]">
        <Routes>
          <Route path="/" element={<Accueil />} />
          <Route path="/courses" element={<Courses />} />
          <Route path="/taches" element={<Taches />} />
          <Route path="/budget" element={<Budget />} />
          <Route path="/entretien" element={<Entretien />} />
          <Route path="/reglages" element={<Reglages />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Navigation />
    </FoyerContext.Provider>
  )
}
