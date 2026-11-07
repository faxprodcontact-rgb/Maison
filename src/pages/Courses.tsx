import { Check, Pencil, Plus } from 'lucide-react'
import { type FormEvent, useMemo, useState } from 'react'
import { Sheet } from '../components/Sheet'
import { useToast } from '../components/Toast'
import { Champ, Chargement, Erreur, Groupe, Liste, Pastille, Section, TitrePage, Vide } from '../components/ui'
import { majuscule } from '../lib/dates'
import { useFoyer } from '../lib/foyer'
import { RAYONS, devinerRayon, normaliser, rayon, separerQuantite } from '../lib/rayons'
import { table } from '../lib/supabase'
import type { Article, ArticleCatalogue } from '../lib/types'
import { useLive } from '../lib/useLive'

export function Courses() {
  const { moi, autre } = useFoyer()
  const toast = useToast()
  const [saisie, setSaisie] = useState('')
  const [edition, setEdition] = useState<Article | null>(null)

  const { lignes: articles, setLignes, erreur, recharger } = useLive<Article>('courses', () =>
    table('courses').select('*').order('cree_le'),
  )
  const { lignes: catalogue } = useLive<ArticleCatalogue>('courses_catalogue', () =>
    table('courses_catalogue')
      .select('*')
      .order('nb_achats', { ascending: false })
      .order('dernier_achat', { ascending: false, nullsFirst: false })
      .limit(400),
  )

  const aAcheter = useMemo(() => (articles ?? []).filter((a) => !a.coche), [articles])
  const panier = useMemo(
    () => (articles ?? []).filter((a) => a.coche).sort((a, b) => (b.coche_le ?? '').localeCompare(a.coche_le ?? '')),
    [articles],
  )
  const surLaListe = useMemo(() => new Set(aAcheter.map((a) => normaliser(a.nom))), [aAcheter])

  const parRayon = useMemo(
    () =>
      RAYONS.map((r) => ({ rayon: r, articles: aAcheter.filter((a) => rayon(a.rayon).cle === r.cle) })).filter(
        (g) => g.articles.length > 0,
      ),
    [aAcheter],
  )

  const recherche = normaliser(separerQuantite(saisie).nom)
  const suggestions = useMemo(() => {
    if (!recherche) return []
    return (catalogue ?? [])
      .filter((c) => normaliser(c.nom).includes(recherche) && !surLaListe.has(normaliser(c.nom)))
      .slice(0, 5)
  }, [catalogue, recherche, surLaListe])

  const habituels = useMemo(
    () => (catalogue ?? []).filter((c) => c.nb_achats > 0 && !surLaListe.has(normaliser(c.nom))).slice(0, 12),
    [catalogue, surLaListe],
  )

  function signalerErreur(message: string) {
    toast(`Modification non enregistrée : ${message}`)
    void recharger()
  }

  async function ajouter(texte: string, rayonImpose?: string) {
    const { nom: brut, quantite } = separerQuantite(texte)
    const nom = majuscule(brut.trim())
    if (!nom) return
    const n = normaliser(nom)
    const existant = articles?.find((a) => normaliser(a.nom) === n)
    setSaisie('')

    if (existant && !existant.coche) {
      toast(`${existant.nom} est déjà sur la liste.`)
      return
    }
    if (existant) {
      // Déjà dans le panier : on le remet sur la liste
      setLignes((l) => l?.map((a) => (a.id === existant.id ? { ...a, coche: false, coche_le: null, quantite } : a)) ?? l)
      const { error } = await table('courses')
        .update({ coche: false, coche_le: null, quantite })
        .eq('id', existant.id)
      if (error) signalerErreur(error.message)
      return
    }

    const connu = catalogue?.find((c) => normaliser(c.nom) === n)
    const nouvel: Article = {
      id: crypto.randomUUID(),
      nom: connu?.nom ?? nom,
      quantite,
      rayon: rayonImpose ?? connu?.rayon ?? devinerRayon(nom),
      coche: false,
      ajoute_par: moi.cle,
      cree_le: new Date().toISOString(),
      coche_le: null,
    }
    setLignes((l) => [...(l ?? []), nouvel])
    const { error } = await table('courses').insert({
      id: nouvel.id,
      nom: nouvel.nom,
      quantite: nouvel.quantite,
      rayon: nouvel.rayon,
      ajoute_par: nouvel.ajoute_par,
    })
    if (error) signalerErreur(error.message)
  }

  async function basculer(article: Article) {
    const coche = !article.coche
    const coche_le = coche ? new Date().toISOString() : null
    setLignes((l) => l?.map((a) => (a.id === article.id ? { ...a, coche, coche_le } : a)) ?? l)
    const { error } = await table('courses').update({ coche, coche_le }).eq('id', article.id)
    if (error) signalerErreur(error.message)
  }

  async function viderPanier() {
    const retires = panier
    setLignes((l) => l?.filter((a) => !a.coche) ?? l)
    const { error } = await table('courses')
      .delete()
      .in(
        'id',
        retires.map((a) => a.id),
      )
    if (error) return signalerErreur(error.message)
    toast(`Panier vidé (${retires.length} article${retires.length > 1 ? 's' : ''}).`, {
      libelle: 'Annuler',
      faire: async () => {
        const { error: e } = await table('courses').insert(retires)
        if (e) signalerErreur(e.message)
        else void recharger()
      },
    })
  }

  function soumettre(e: FormEvent) {
    e.preventDefault()
    void ajouter(saisie)
  }

  return (
    <>
      <TitrePage
        apres={
          aAcheter.length > 0 && (
            <span className="nombre pb-1 text-encre-2">
              {aAcheter.length} à acheter
            </span>
          )
        }
      >
        Courses
      </TitrePage>

      <div className="sticky top-0 z-20 bg-fond px-3 pt-[env(safe-area-inset-top)] pb-3">
        <form onSubmit={soumettre} className="relative flex gap-2">
          <input
            className="champ flex-1 !bg-surface"
            placeholder="Ajouter un article, ex. 2 baguettes"
            value={saisie}
            onChange={(e) => setSaisie(e.target.value)}
            enterKeyHint="done"
            autoComplete="off"
            aria-label="Article à ajouter"
          />
          <button
            type="submit"
            className="grid w-13 shrink-0 place-items-center rounded-[0.9rem] bg-encre text-fond disabled:opacity-40"
            disabled={!saisie.trim()}
            aria-label="Ajouter à la liste"
          >
            <Plus size={24} />
          </button>
        </form>
        {suggestions.length > 0 && (
          <ul className="liste mt-2 overflow-hidden rounded-2xl bg-surface shadow-lg">
            {suggestions.map((s) => {
              const r = rayon(s.rayon)
              return (
                <li key={s.nom_normalise}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 px-4 py-3 text-left"
                    onClick={() => {
                      const { quantite } = separerQuantite(saisie)
                      void ajouter(quantite ? `${quantite} ${s.nom}` : s.nom, s.rayon)
                    }}
                  >
                    <r.icone size={18} className="text-encre-3" />
                    <span className="flex-1">{s.nom}</span>
                    <span className="text-[0.85rem] text-encre-3">{r.nom}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {erreur && <Erreur message={erreur} />}
      {!articles && !erreur && <Chargement />}

      {articles && !saisie && habituels.length > 0 && (
        <div className="mb-5">
          <p className="px-5 pb-2 text-[0.95rem] font-semibold text-encre-2">Souvent achetés</p>
          <div className="flex gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none]">
            {habituels.map((h) => (
              <button
                key={h.nom_normalise}
                type="button"
                className="puce shrink-0"
                onClick={() => void ajouter(h.nom, h.rayon)}
              >
                <Plus size={15} className="text-encre-3" />
                {h.nom}
              </button>
            ))}
          </div>
        </div>
      )}

      {articles && aAcheter.length === 0 && (
        <Vide titre={panier.length > 0 ? 'Tout est dans le panier.' : 'La liste est vide.'}>
          {panier.length === 0 &&
            `Ajoutez un article ci-dessus : il est rangé tout seul dans le bon rayon, et ${autre.prenom} le voit aussitôt.`}
        </Vide>
      )}

      {parRayon.map(({ rayon: r, articles: liste }) => (
        <Section
          key={r.cle}
          titre={
            <span className="flex items-center gap-2">
              <r.icone size={17} />
              {r.nom}
            </span>
          }
        >
          <Liste>
            {liste.map((a) => (
              <LigneArticle key={a.id} article={a} basculer={basculer} modifier={setEdition} />
            ))}
          </Liste>
        </Section>
      ))}

      {panier.length > 0 && (
        <Section
          titre={`Dans le panier (${panier.length})`}
          apres={
            <button type="button" className="text-[0.95rem] font-semibold underline underline-offset-4" onClick={() => void viderPanier()}>
              Vider le panier
            </button>
          }
        >
          <Liste>
            {panier.map((a) => (
              <LigneArticle key={a.id} article={a} basculer={basculer} modifier={setEdition} />
            ))}
          </Liste>
        </Section>
      )}

      <Sheet ouvert={edition !== null} fermer={() => setEdition(null)} titre="Modifier l'article">
        {edition && (
          <FormulaireArticle
            article={edition}
            fini={() => setEdition(null)}
            erreur={signalerErreur}
            appliquer={(maj) => setLignes((l) => l?.map((a) => (a.id === edition.id ? { ...a, ...maj } : a)) ?? l)}
            retirer={() => setLignes((l) => l?.filter((a) => a.id !== edition.id) ?? l)}
          />
        )}
      </Sheet>
    </>
  )
}

function LigneArticle({
  article,
  basculer,
  modifier,
}: {
  article: Article
  basculer: (a: Article) => void
  modifier: (a: Article) => void
}) {
  return (
    <li className="flex items-center">
      <button
        type="button"
        className="flex min-h-14 flex-1 items-center gap-3.5 py-2.5 pl-4 text-left"
        onClick={() => basculer(article)}
        aria-pressed={article.coche}
      >
        <span className={`case ${article.coche ? 'text-encre-3' : 'text-encre'}`} data-coche={article.coche}>
          {article.coche && <Check size={16} strokeWidth={3} />}
        </span>
        <span className={`flex-1 text-[1.05rem] ${article.coche ? 'text-encre-3 line-through' : ''}`}>
          {article.nom}
          {article.quantite && <span className="nombre ml-2 text-encre-3">{article.quantite}</span>}
        </span>
      </button>
      {!article.coche && <Pastille cle={article.ajoute_par} taille={18} />}
      <button
        type="button"
        className="grid size-12 shrink-0 place-items-center text-encre-3"
        onClick={() => modifier(article)}
        aria-label={`Modifier ${article.nom}`}
      >
        <Pencil size={17} />
      </button>
    </li>
  )
}

function FormulaireArticle({
  article,
  fini,
  erreur,
  appliquer,
  retirer,
}: {
  article: Article
  fini: () => void
  erreur: (m: string) => void
  appliquer: (maj: Partial<Article>) => void
  retirer: () => void
}) {
  const [nom, setNom] = useState(article.nom)
  const [quantite, setQuantite] = useState(article.quantite ?? '')
  const [rayonChoisi, setRayon] = useState(rayon(article.rayon).cle)

  async function enregistrer(e: FormEvent) {
    e.preventDefault()
    if (!nom.trim()) return
    const maj = { nom: majuscule(nom.trim()), quantite: quantite.trim() || null, rayon: rayonChoisi }
    appliquer(maj)
    fini()
    const { error } = await table('courses').update(maj).eq('id', article.id)
    if (error) erreur(error.message)
  }

  async function supprimer() {
    retirer()
    fini()
    const { error } = await table('courses').delete().eq('id', article.id)
    if (error) erreur(error.message)
  }

  return (
    <form onSubmit={enregistrer}>
      <Champ etiquette="Article">
        <input className="champ" value={nom} onChange={(e) => setNom(e.target.value)} required />
      </Champ>
      <Champ etiquette="Quantité">
        <input
          className="champ"
          value={quantite}
          onChange={(e) => setQuantite(e.target.value)}
          placeholder="Ex. 2, 500 g, 1 paquet"
        />
      </Champ>
      <Groupe etiquette="Rayon">
        <div className="flex flex-wrap gap-2">
          {RAYONS.map((r) => (
            <button
              key={r.cle}
              type="button"
              className="puce"
              aria-pressed={rayonChoisi === r.cle}
              onClick={() => setRayon(r.cle)}
            >
              <r.icone size={16} />
              {r.nom}
            </button>
          ))}
        </div>
      </Groupe>
      <div className="mt-2 flex gap-3">
        <button type="button" className="bouton bouton-danger" onClick={() => void supprimer()}>
          Supprimer
        </button>
        <button type="submit" className="bouton bouton-principal flex-1">
          Enregistrer
        </button>
      </div>
      <p className="mt-4 text-[0.85rem] text-encre-3">Le rayon choisi sera retenu pour les prochaines fois.</p>
    </form>
  )
}
