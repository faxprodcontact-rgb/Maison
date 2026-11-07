import { ChevronLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Pastille } from '../components/ui'
import { useFoyer } from '../lib/foyer'
import { supabase } from '../lib/supabase'

export function Reglages() {
  const { moi, email } = useFoyer()

  return (
    <>
      <div className="px-3 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
        <Link to="/" className="inline-flex items-center gap-1 rounded-full py-2 pr-3 pl-1 text-encre-2">
          <ChevronLeft size={20} /> Accueil
        </Link>
      </div>
      <header className="px-5 pt-3 pb-6">
        <h1 className="titre-page">Réglages</h1>
      </header>

      <div className="mx-3 flex items-center gap-4 rounded-2xl bg-surface px-4 py-4">
        <Pastille cle={moi.cle} taille={44} />
        <div className="min-w-0 flex-1">
          <p className="text-[1.15rem] font-semibold">{moi.prenom}</p>
          <p className="truncate text-encre-2">{email}</p>
        </div>
      </div>

      <section className="mx-3 mt-6 rounded-2xl bg-surface px-4 py-4">
        <h2 className="text-[1.15rem] font-semibold">Installer l'app sur votre téléphone</h2>
        <h3 className="mt-4 font-semibold">Sur iPhone</h3>
        <p className="mt-1 text-encre-2">
          Ouvrez l'app dans Safari, touchez le bouton Partager (le carré avec une flèche), puis « Sur l'écran
          d'accueil ».
        </p>
        <h3 className="mt-4 font-semibold">Sur Android</h3>
        <p className="mt-1 text-encre-2">Ouvrez l'app dans Chrome, touchez le menu ⋮, puis « Installer l'application ».</p>
      </section>

      <div className="mx-3 mt-6">
        <button type="button" className="bouton bouton-secondaire w-full" onClick={() => void supabase.auth.signOut()}>
          Se déconnecter
        </button>
      </div>
    </>
  )
}
