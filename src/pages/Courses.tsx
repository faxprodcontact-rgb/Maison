import { CalendarPlus, Check, Clock, Leaf, Plus, RefreshCw, Trash2, X } from 'lucide-react'
import { type FormEvent, useMemo, useState } from 'react'
import { FicheMenu, MenuSemaine, type OuvrirMenu } from '../components/Menu'
import { Sheet } from '../components/Sheet'
import { useToast } from '../components/Toast'
import { Chargement, Erreur, Pastille, TitrePage } from '../components/ui'
import { majuscule } from '../lib/dates'
import { useFoyer } from '../lib/foyer'
import { devinerRayon, normaliser, rayon, separerQuantite } from '../lib/rayons'
import { type Repas, ideesDeLaSemaine } from '../lib/repas'
import { table } from '../lib/supabase'
import type { Article, ArticleCatalogue } from '../lib/types'
import { useLive } from '../lib/useLive'

export function Courses() {
  const { moi, autre } = useFoyer()
  const toast = useToast()
  const [saisie, setSaisie] = useState('')
  const [confirmer, setConfirmer] = useState(false)
  const [page, setPage] = useState(0)
  const [menuChoix, setMenuChoix] = useState<Parameters<OuvrirMenu>[0] | null>(null)

  const { lignes: articles, setLignes, erreur, recharger } = useLive<Article>('courses', () =>
    table('courses').select('*').order('cree_le'),
  )
  const { lignes: catalogue } = useLive<ArticleCatalogue>('courses_catalogue', () =>
    table('courses_catalogue').select('*').order('nb_achats', { ascending: false }).limit(400),
  )

  // À prendre d'abord, puis ce qui est déjà dans le panier du drive
  const liste = useMemo(
    () => [...(articles ?? [])].sort((a, b) => Number(a.coche) - Number(b.coche) || a.cree_le.localeCompare(b.cree_le)),
    [articles],
  )
  const restants = liste.filter((a) => !a.coche).length
  const dejaSurLaListe = useMemo(() => new Set((articles ?? []).map((a) => normaliser(a.nom))), [articles])

  const recherche = normaliser(separerQuantite(saisie).nom)
  const suggestions = useMemo(() => {
    if (recherche.length < 2) return []
    return (catalogue ?? [])
      .filter((c) => normaliser(c.nom).includes(recherche) && !dejaSurLaListe.has(normaliser(c.nom)))
      .slice(0, 4)
  }, [catalogue, recherche, dejaSurLaListe])

  const idees = useMemo(() => ideesDeLaSemaine(page), [page])

  function erreurReseau(message: string) {
    toast(`Modification non enregistrée : ${message}`)
    void recharger()
  }

  /** Ajoute des articles (ceux déjà sur la liste sont ignorés). Renvoie le nombre ajouté. */
  async function ajouter(textes: string[]): Promise<number> {
    const nouveaux: Article[] = []
    const vus = new Set(dejaSurLaListe)
    for (const texte of textes) {
      const { nom: brut, quantite } = separerQuantite(texte)
      const nom = majuscule(brut.trim())
      const n = normaliser(nom)
      if (!nom || vus.has(n)) continue
      vus.add(n)
      const connu = catalogue?.find((c) => normaliser(c.nom) === n)
      nouveaux.push({
        id: crypto.randomUUID(),
        nom: connu?.nom ?? nom,
        quantite,
        rayon: connu?.rayon ?? devinerRayon(nom),
        coche: false,
        ajoute_par: moi.cle,
        cree_le: new Date().toISOString(),
        coche_le: null,
      })
    }
    if (nouveaux.length === 0) return 0
    setLignes((l) => [...(l ?? []), ...nouveaux])
    const { error } = await table('courses').insert(
      nouveaux.map(({ id, nom, quantite, rayon: r, ajoute_par }) => ({ id, nom, quantite, rayon: r, ajoute_par })),
    )
    if (error) erreurReseau(error.message)
    return nouveaux.length
  }

  async function soumettre(e: FormEvent) {
    e.preventDefault()
    const texte = saisie.trim()
    if (!texte) return
    setSaisie('')
    const n = await ajouter([texte])
    if (n === 0) toast(`${majuscule(separerQuantite(texte).nom)} est déjà sur la liste.`)
  }

  async function basculer(a: Article) {
    const coche = !a.coche
    const coche_le = coche ? new Date().toISOString() : null
    setLignes((l) => l?.map((x) => (x.id === a.id ? { ...x, coche, coche_le } : x)) ?? l)
    const { error } = await table('courses').update({ coche, coche_le }).eq('id', a.id)
    if (error) erreurReseau(error.message)
  }

  async function retirer(a: Article) {
    setLignes((l) => l?.filter((x) => x.id !== a.id) ?? l)
    const { error } = await table('courses').delete().eq('id', a.id)
    if (error) erreurReseau(error.message)
  }

  async function viderLaListe() {
    const tout = articles ?? []
    setConfirmer(false)
    setLignes([])
    const { error } = await table('courses')
      .delete()
      .in(
        'id',
        tout.map((a) => a.id),
      )
    if (error) return erreurReseau(error.message)
    toast('La liste est vide, prête pour le prochain drive.')
  }

  async function ajouterRepas(r: Repas) {
    const n = await ajouter(r.ingredients)
    toast(
      n === 0
        ? `Tout ce qu'il faut pour « ${r.nom} » est déjà sur la liste.`
        : `${n} ingrédient${n > 1 ? 's' : ''} pour « ${r.nom} » ajouté${n > 1 ? 's' : ''}.`,
    )
  }

  return (
    <>
      <TitrePage apres={restants > 0 && <span className="nombre pb-1 text-encre-2">{restants} à prendre</span>}>
        Courses
      </TitrePage>
      <p className="-mt-2 px-5 pb-4 text-encre-2">Ce qu'il ne faut pas oublier pour le prochain drive.</p>

      <div className="sticky top-0 z-20 bg-fond px-3 pt-[env(safe-area-inset-top)] pb-3">
        <form onSubmit={soumettre} className="flex gap-2 rounded-[1.3rem] bg-surface p-2 shadow-[0_8px_24px_-18px_rgb(0_0_0/0.5)]">
          <input
            className="min-w-0 flex-1 bg-transparent px-3 text-[1.05rem] outline-none placeholder:text-encre-3"
            placeholder="Lait, 2 baguettes, idée de repas…"
            value={saisie}
            onChange={(e) => setSaisie(e.target.value)}
            enterKeyHint="done"
            autoComplete="off"
            aria-label="Ajouter à la liste"
          />
          <button
            type="submit"
            className="grid size-12 shrink-0 place-items-center rounded-[0.95rem] bg-encre text-fond transition-opacity disabled:opacity-30"
            disabled={!saisie.trim()}
            aria-label="Ajouter à la liste"
          >
            <Plus size={24} />
          </button>
        </form>
        {suggestions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2 px-1">
            {suggestions.map((s) => (
              <button
                key={s.nom_normalise}
                type="button"
                className="puce"
                onClick={() => {
                  const { quantite } = separerQuantite(saisie)
                  setSaisie('')
                  void ajouter([quantite ? `${quantite} ${s.nom}` : s.nom])
                }}
              >
                <Plus size={14} className="text-encre-3" /> {s.nom}
              </button>
            ))}
          </div>
        )}
      </div>

      {erreur && <Erreur message={erreur} />}
      {!articles && !erreur && <Chargement />}

      {articles && liste.length === 0 && (
        <div className="mx-3 rounded-[1.4rem] border-2 border-dashed border-trait px-5 py-8 text-center">
          <p className="text-[1.25rem] font-semibold">La liste est vide.</p>
          <p className="mt-2 text-encre-2">
            Notez ici ce qu'il faut racheter ou une idée de repas : {autre.prenom} le verra tout de suite.
          </p>
        </div>
      )}

      {liste.length > 0 && (
        <div className="mx-3 overflow-hidden rounded-[1.4rem] bg-surface shadow-[0_10px_30px_-26px_rgb(0_0_0/0.6)]">
          <ul className="liste">
            {liste.map((a) => {
              const r = rayon(a.rayon)
              return (
                <li key={a.id} className="article flex items-center">
                  <button
                    type="button"
                    onClick={() => void basculer(a)}
                    aria-pressed={a.coche}
                    className="flex min-h-15 flex-1 items-center gap-3 py-2 pl-3 text-left"
                  >
                    <span
                      className={`grid size-10 shrink-0 place-items-center rounded-full ${a.coche ? 'bg-encre text-fond' : 'bg-surface-2 text-encre-2'}`}
                    >
                      {a.coche ? <Check size={19} strokeWidth={3} /> : <r.icone size={18} />}
                    </span>
                    <span className={`flex-1 text-[1.05rem] leading-snug ${a.coche ? 'text-encre-3 line-through' : ''}`}>
                      {a.nom}
                      {a.quantite && <span className="nombre ml-2 text-encre-3">{a.quantite}</span>}
                    </span>
                  </button>
                  {!a.coche && <Pastille cle={a.ajoute_par} taille={18} />}
                  <button
                    type="button"
                    onClick={() => void retirer(a)}
                    className="grid size-12 shrink-0 place-items-center text-encre-3"
                    aria-label={`Retirer ${a.nom}`}
                  >
                    <X size={18} />
                  </button>
                </li>
              )
            })}
          </ul>
          <div className="flex items-center border-t border-trait px-4 py-3">
            <span className="flex-1 text-[0.9rem] text-encre-2">
              {liste.length} article{liste.length > 1 ? 's' : ''}
              {liste.length - restants > 0 && `, dont ${liste.length - restants} déjà pris`}
            </span>
            <button
              type="button"
              onClick={() => setConfirmer(true)}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[0.9rem] font-semibold text-retard"
            >
              <Trash2 size={16} /> Vider la liste
            </button>
          </div>
        </div>
      )}

      <MenuSemaine ouvrir={setMenuChoix} />

      <section aria-labelledby="titre-repas" className="mt-10">
        <div className="flex items-end gap-3 px-5 pb-1">
          <h2 id="titre-repas" className="flex-1 text-[1.35rem] font-bold tracking-tight">
            Repas proposés
          </h2>
          <button
            type="button"
            onClick={() => setPage((p) => p + 1)}
            className="inline-flex items-center gap-1.5 pb-1 text-[0.9rem] font-semibold underline underline-offset-4"
          >
            <RefreshCw size={15} /> Autres idées
          </button>
        </div>
        <p className="px-5 pb-3 text-[0.92rem] text-encre-2">Pas d'idée ? Ajoutez les ingrédients d'un repas en un geste.</p>
        <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-3 pb-2 [scrollbar-width:none]">
          {idees.map((r) => (
            <article key={r.nom} className="flex w-[17rem] shrink-0 snap-start flex-col rounded-[1.4rem] bg-surface p-4">
              <div className="flex items-start gap-3">
                <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-fond text-[2rem]" aria-hidden="true">
                  {r.emoji}
                </span>
                <div className="min-w-0">
                  <h3 className="text-[1.1rem] leading-tight font-semibold">{r.nom}</h3>
                  <p className="mt-1 flex flex-wrap items-center gap-x-2.5 text-[0.82rem] text-encre-2">
                    <span className="inline-flex items-center gap-1">
                      <Clock size={13} /> {r.duree}
                    </span>
                    {r.vege && (
                      <span className="inline-flex items-center gap-1">
                        <Leaf size={13} /> Végétarien
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <ul className="mt-3 flex flex-1 flex-wrap content-start gap-1.5">
                {r.ingredients.map((i) => (
                  <li
                    key={i}
                    className={`rounded-full px-2.5 py-1 text-[0.8rem] ${
                      dejaSurLaListe.has(normaliser(i)) ? 'bg-encre text-fond' : 'bg-fond text-encre-2'
                    }`}
                  >
                    {i}
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex gap-2">
                <button type="button" className="bouton bouton-secondaire flex-1 !px-3 !py-2.5 !text-[0.92rem]" onClick={() => void ajouterRepas(r)}>
                  <Plus size={16} /> Ingrédients
                </button>
                <button
                  type="button"
                  className="bouton bouton-principal flex-1 !px-3 !py-2.5 !text-[0.92rem]"
                  onClick={() => setMenuChoix({ repas: r })}
                >
                  <CalendarPlus size={16} /> Au menu
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <FicheMenu choix={menuChoix} fermer={() => setMenuChoix(null)} ajouterIngredients={(r) => void ajouterRepas(r)} />

      <Sheet ouvert={confirmer} fermer={() => setConfirmer(false)} titre="Vider la liste ?">
        <p className="text-encre-2">
          Les {liste.length} article{liste.length > 1 ? 's' : ''} de la liste seront supprimés, chez vous et chez {autre.prenom}.
        </p>
        <div className="mt-6 flex gap-3">
          <button type="button" className="bouton bouton-secondaire flex-1" onClick={() => setConfirmer(false)}>
            Annuler
          </button>
          <button type="button" className="bouton flex-1 bg-retard text-white" onClick={() => void viderLaListe()}>
            Vider la liste
          </button>
        </div>
      </Sheet>
    </>
  )
}
