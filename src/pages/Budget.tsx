import { ChevronLeft, ChevronRight } from 'lucide-react'
import { type FormEvent, useMemo, useState } from 'react'
import { Sheet } from '../components/Sheet'
import { useToast } from '../components/Toast'
import { BoutonAjouter, Champ, Chargement, Choix, Erreur, Groupe, Liste, Pastille, Section, TitrePage, Vide } from '../components/ui'
import { calculerSolde } from '../lib/budget'
import { CATEGORIES_BUDGET, REMBOURSEMENT, categorieBudget, euros, lireMontant } from '../lib/categories'
import { aujourdhui, debutMois, finMois, jourRelatif, majuscule, nomMois, nomMoisSeul } from '../lib/dates'
import { useFoyer } from '../lib/foyer'
import { table } from '../lib/supabase'
import type { Depense, Solde } from '../lib/types'
import { useLive } from '../lib/useLive'

export function Budget() {
  const { moi, autre, membre } = useFoyer()
  const maintenant = new Date()
  const [periode, setPeriode] = useState({ annee: maintenant.getFullYear(), mois: maintenant.getMonth() })
  const [edition, setEdition] = useState<Partial<Depense> | null>(null)
  const [remboursement, setRemboursement] = useState(false)
  const [filtre, setFiltre] = useState<string | null>(null)

  const debut = debutMois(periode.annee, periode.mois)
  const fin = finMois(periode.annee, periode.mois)
  const { lignes, setLignes, erreur, recharger } = useLive<Depense>(
    'depenses',
    () =>
      table('depenses')
        .select('*')
        .gte('le', debut)
        .lte('le', fin)
        .order('le', { ascending: false })
        .order('cree_le', { ascending: false }),
    [debut],
  )
  const { lignes: soldes, recharger: rechargerSoldes } = useLive<Solde>('depenses', () =>
    table('budget_soldes').select('*'),
  )

  const toutRecharger = () => {
    void recharger()
    void rechargerSoldes()
  }

  const solde = calculerSolde(soldes ?? [], moi.cle, autre.cle) // > 0 : l'autre me doit
  const creancier = solde > 0 ? moi : autre
  const debiteur = solde > 0 ? autre : moi
  const montantDu = Math.abs(solde)

  const stats = useMemo(() => {
    const depenses = (lignes ?? []).filter((d) => !d.est_remboursement)
    const total = depenses.reduce((s, d) => s + Number(d.montant), 0)
    const parPersonne = new Map<string, number>()
    const parCategorie = new Map<string, number>()
    for (const d of depenses) {
      parPersonne.set(d.paye_par, (parPersonne.get(d.paye_par) ?? 0) + Number(d.montant))
      parCategorie.set(d.categorie, (parCategorie.get(d.categorie) ?? 0) + Number(d.montant))
    }
    const categories = [...parCategorie.entries()]
      .map(([cle, montant]) => ({ categorie: categorieBudget(cle), montant }))
      .sort((a, b) => b.montant - a.montant)
    return { total, parPersonne, categories }
  }, [lignes])

  const parJour = useMemo(() => {
    const visibles = (lignes ?? []).filter((d) => !filtre || d.categorie === filtre)
    const jours = new Map<string, Depense[]>()
    for (const d of visibles) jours.set(d.le, [...(jours.get(d.le) ?? []), d])
    return [...jours.entries()]
  }, [lignes, filtre])

  const estMoisCourant = periode.annee === maintenant.getFullYear() && periode.mois === maintenant.getMonth()

  function changerMois(delta: number) {
    setFiltre(null)
    setPeriode(({ annee, mois }) => {
      const d = new Date(annee, mois + delta, 1)
      return { annee: d.getFullYear(), mois: d.getMonth() }
    })
  }

  const maxCategorie = stats.categories[0]?.montant ?? 0

  return (
    <>
      <TitrePage>Budget</TitrePage>

      {soldes && (
        <div className="mx-3 mb-6 rounded-2xl bg-surface px-4 py-4">
          {montantDu === 0 ? (
            <p className="text-[1.15rem] font-semibold">Vous êtes à l'équilibre.</p>
          ) : (
            <>
              <p className="flex items-center gap-2.5 text-[1.15rem] leading-snug font-semibold">
                <Pastille cle={debiteur.cle} taille={24} decoratif />
                <span>
                  {debiteur.cle === moi.cle ? 'Vous devez' : `${debiteur.prenom} vous doit`}{' '}
                  <span className="nombre">{euros(montantDu)}</span>
                  {debiteur.cle === moi.cle && ` à ${creancier.prenom}`}.
                </span>
              </p>
              <button
                type="button"
                className="mt-3 text-[0.95rem] font-semibold underline underline-offset-4"
                onClick={() => setRemboursement(true)}
              >
                Enregistrer un remboursement
              </button>
            </>
          )}
        </div>
      )}

      <div className="flex items-center gap-1 px-3">
        <button type="button" className="grid size-11 place-items-center rounded-full" onClick={() => changerMois(-1)} aria-label="Mois précédent">
          <ChevronLeft size={22} />
        </button>
        <h2 className="flex-1 text-center text-[1.1rem] font-semibold">{majuscule(nomMois(periode.annee, periode.mois))}</h2>
        <button
          type="button"
          className="grid size-11 place-items-center rounded-full disabled:opacity-30"
          onClick={() => changerMois(1)}
          disabled={estMoisCourant}
          aria-label="Mois suivant"
        >
          <ChevronRight size={22} />
        </button>
      </div>

      {erreur && <Erreur message={erreur} />}
      {!lignes && !erreur && <Chargement />}

      {lignes && (
        <div className="px-5 pt-3 pb-2">
          <p className="nombre text-[3.2rem] leading-none font-bold tracking-tight" style={{ fontStretch: '85%' }}>
            {euros(stats.total)}
          </p>
          <p className="mt-2 text-encre-2">
            dépensés en {nomMoisSeul(periode.annee, periode.mois)}
          </p>
          {stats.total > 0 && <RepartitionPayeurs parPersonne={stats.parPersonne} total={stats.total} />}
        </div>
      )}

      {lignes && stats.total === 0 && (lignes ?? []).length === 0 && (
        <Vide titre={estMoisCourant ? 'Aucune dépense ce mois-ci.' : 'Aucune dépense ce mois-là.'}>
          {estMoisCourant &&
            'Ajoutez une dépense avec le bouton +. Indiquez qui a payé : l’app calcule qui doit combien à qui.'}
        </Vide>
      )}

      {stats.categories.length > 0 && (
        <Section titre="Par catégorie" apres={filtre && (
          <button type="button" className="text-[0.9rem] font-semibold underline underline-offset-4" onClick={() => setFiltre(null)}>
            Tout afficher
          </button>
        )}>
          <ul className="px-3">
            {stats.categories.map(({ categorie: c, montant }) => (
              <li key={c.cle}>
                <button
                  type="button"
                  className={`w-full rounded-xl px-2 py-2 text-left ${filtre && filtre !== c.cle ? 'opacity-45' : ''}`}
                  onClick={() => setFiltre((f) => (f === c.cle ? null : c.cle))}
                  aria-pressed={filtre === c.cle}
                >
                  <span className="flex items-center gap-2.5">
                    <c.icone size={18} className="text-encre-2" />
                    <span className="flex-1">{c.nom}</span>
                    <span className="nombre font-semibold">{euros(montant)}</span>
                  </span>
                  <span className="mt-1.5 ml-7 block h-1.5 rounded-full bg-surface-2">
                    <span
                      className="block h-full rounded-full bg-encre-2"
                      style={{ width: `${Math.max(2, (montant / maxCategorie) * 100)}%` }}
                    />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {parJour.map(([jour, depenses]) => (
        <Section key={jour} titre={majuscule(jourRelatif(jour))}>
          <Liste>
            {depenses.map((d) => {
              const c = categorieBudget(d.categorie)
              const payeur = membre(d.paye_par)
              const beneficiaire = membre(d.pour)
              return (
                <li key={d.id}>
                  <button type="button" className="flex w-full items-center gap-3 px-4 py-3 text-left" onClick={() => setEdition(d)}>
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-2">
                      <c.icone size={19} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[1.02rem]">{d.libelle || c.nom}</span>
                      <span className="mt-0.5 flex items-center gap-1.5 text-[0.85rem] text-encre-2">
                        <Pastille cle={d.paye_par} taille={16} decoratif />
                        {d.est_remboursement
                          ? `${payeur?.prenom} a remboursé ${beneficiaire?.prenom}`
                          : d.pour
                            ? `${payeur?.prenom} a payé pour ${beneficiaire?.cle === d.paye_par ? 'lui-même' : beneficiaire?.prenom}`
                            : `${payeur?.prenom} a payé, partagé`}
                      </span>
                    </span>
                    <span className="nombre font-semibold">{euros(Number(d.montant))}</span>
                  </button>
                </li>
              )
            })}
          </Liste>
        </Section>
      ))}

      <BoutonAjouter libelle="Ajouter une dépense" onClick={() => setEdition({})} />

      <Sheet ouvert={edition !== null} fermer={() => setEdition(null)} titre={edition?.id ? 'Modifier la dépense' : 'Nouvelle dépense'}>
        {edition && (
          <FormulaireDepense
            key={edition.id ?? 'nouvelle'}
            depense={edition}
            fini={() => setEdition(null)}
            appliquer={(id, maj) =>
              setLignes((l) => (maj ? l?.map((d) => (d.id === id ? { ...d, ...maj } : d)) : l?.filter((d) => d.id !== id)) ?? l)
            }
            recharger={toutRecharger}
          />
        )}
      </Sheet>

      <Sheet ouvert={remboursement} fermer={() => setRemboursement(false)} titre="Remboursement">
        {remboursement && (
          <FormulaireRemboursement
            de={debiteur.cle}
            a={creancier.cle}
            montant={montantDu}
            fini={() => setRemboursement(false)}
            recharger={toutRecharger}
          />
        )}
      </Sheet>
    </>
  )
}

function RepartitionPayeurs({ parPersonne, total }: { parPersonne: Map<string, number>; total: number }) {
  const { membres } = useFoyer()
  const parts = membres.map((m) => ({ membre: m, montant: parPersonne.get(m.cle) ?? 0 }))
  return (
    <div className="mt-5">
      <div className="flex h-2 gap-0.5" role="img" aria-label="Répartition de qui a payé">
        {parts
          .filter((p) => p.montant > 0)
          .map((p) => (
            <span
              key={p.membre.cle}
              className="h-full rounded-full"
              style={{ width: `${(p.montant / total) * 100}%`, background: p.membre.couleur }}
            />
          ))}
      </div>
      <div className="mt-2.5 flex justify-between gap-4 text-[0.92rem]">
        {parts.map((p) => (
          <span key={p.membre.cle} className="flex items-center gap-1.5 text-encre-2">
            <Pastille cle={p.membre.cle} taille={16} decoratif />
            {p.membre.prenom} a payé <span className="nombre font-semibold text-encre">{euros(p.montant, true)}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

function FormulaireDepense({
  depense,
  fini,
  appliquer,
  recharger,
}: {
  depense: Partial<Depense>
  fini: () => void
  appliquer: (id: string, maj: Partial<Depense> | null) => void
  recharger: () => void
}) {
  const { moi, membres } = useFoyer()
  const toast = useToast()
  const existante = Boolean(depense.id)
  const [montant, setMontant] = useState(depense.montant ? String(depense.montant).replace('.', ',') : '')
  const [libelle, setLibelle] = useState(depense.libelle ?? '')
  const [categorie, setCategorie] = useState(depense.categorie ?? 'courses')
  const [payePar, setPayePar] = useState(depense.paye_par ?? moi.cle)
  const [pour, setPour] = useState(depense.pour ?? '')
  const [le, setLe] = useState(depense.le ?? aujourdhui())
  const valeur = lireMontant(montant)
  const estRemboursement = depense.est_remboursement === true

  async function enregistrer(e: FormEvent) {
    e.preventDefault()
    if (valeur === null) return
    const donnees = {
      montant: valeur,
      libelle: libelle.trim() || null,
      categorie: estRemboursement ? REMBOURSEMENT.cle : categorie,
      paye_par: payePar,
      pour: pour || null,
      le: le || aujourdhui(),
    }
    fini()
    if (existante && depense.id) {
      appliquer(depense.id, donnees)
      const { error } = await table('depenses').update(donnees).eq('id', depense.id)
      if (error) toast(`Modification non enregistrée : ${error.message}`)
    } else {
      const { error } = await table('depenses').insert(donnees)
      if (error) toast(`Dépense non enregistrée : ${error.message}`)
      else toast(`Dépense de ${euros(valeur)} ajoutée.`)
    }
    recharger()
  }

  async function supprimer() {
    if (!depense.id) return
    fini()
    appliquer(depense.id, null)
    const { error } = await table('depenses').delete().eq('id', depense.id)
    if (error) toast(`Suppression impossible : ${error.message}`)
    else toast('Dépense supprimée.')
    recharger()
  }

  return (
    <form onSubmit={enregistrer}>
      <label className="mb-5 block">
        <span className="mb-2 block text-[0.9rem] font-semibold text-encre-2">Montant</span>
        <span className="flex items-baseline gap-2 border-b-2 border-trait focus-within:border-encre">
          <input
            className="nombre w-full bg-transparent py-1 text-[2.6rem] font-bold tracking-tight outline-none placeholder:text-encre-3"
            inputMode="decimal"
            placeholder="0,00"
            value={montant}
            onChange={(e) => setMontant(e.target.value.replace(/[^\d.,]/g, ''))}
            autoFocus={!existante}
            required
          />
          <span className="text-[1.8rem] font-semibold text-encre-2">€</span>
        </span>
      </label>

      <Champ etiquette="Description">
        <input
          className="champ"
          value={libelle}
          onChange={(e) => setLibelle(e.target.value)}
          placeholder={estRemboursement ? 'Remboursement' : 'Ex. Carrefour, plombier, électricité'}
        />
      </Champ>

      {!estRemboursement && (
        <Groupe etiquette="Catégorie">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES_BUDGET.map((c) => (
              <button key={c.cle} type="button" className="puce" aria-pressed={categorie === c.cle} onClick={() => setCategorie(c.cle)}>
                <c.icone size={16} />
                {c.nom}
              </button>
            ))}
          </div>
        </Groupe>
      )}

      <Groupe etiquette={estRemboursement ? 'Qui a remboursé ?' : 'Qui a payé ?'}>
        <Choix
          etiquette="Qui a payé ?"
          valeur={payePar}
          changer={setPayePar}
          options={membres.map((m) => ({ valeur: m.cle, libelle: <><Pastille cle={m.cle} taille={18} decoratif /> {m.prenom}</> }))}
        />
      </Groupe>

      {!estRemboursement && (
        <Groupe etiquette="Pour qui ?">
          <Choix
            etiquette="Pour qui ?"
            valeur={pour}
            changer={setPour}
            options={[
              { valeur: '', libelle: <><Pastille cle={null} taille={18} decoratif /> Nous deux</> },
              ...membres.map((m) => ({ valeur: m.cle, libelle: <><Pastille cle={m.cle} taille={18} decoratif /> {m.prenom}</> })),
            ]}
          />
          <p className="mt-2 text-[0.85rem] text-encre-3">
            {pour === ''
              ? 'Partagé moitié-moitié.'
              : pour === payePar
                ? 'Dépense personnelle : personne ne doit rien.'
                : 'L’autre doit la totalité du montant.'}
          </p>
        </Groupe>
      )}

      <Champ etiquette="Date">
        <input type="date" className="champ" value={le} onChange={(e) => setLe(e.target.value)} max={aujourdhui()} />
      </Champ>

      <div className="mt-2 flex gap-3">
        {existante && (
          <button type="button" className="bouton bouton-danger" onClick={() => void supprimer()}>
            Supprimer
          </button>
        )}
        <button type="submit" className="bouton bouton-principal flex-1" disabled={valeur === null}>
          {existante ? 'Enregistrer' : 'Ajouter la dépense'}
        </button>
      </div>
    </form>
  )
}

function FormulaireRemboursement({
  de,
  a,
  montant: du,
  fini,
  recharger,
}: {
  de: string
  a: string
  montant: number
  fini: () => void
  recharger: () => void
}) {
  const { membre } = useFoyer()
  const toast = useToast()
  const [montant, setMontant] = useState(String(du).replace('.', ','))
  const valeur = lireMontant(montant)
  const debiteur = membre(de)
  const creancier = membre(a)

  async function enregistrer(e: FormEvent) {
    e.preventDefault()
    if (valeur === null) return
    fini()
    const { error } = await table('depenses').insert({
      montant: valeur,
      libelle: 'Remboursement',
      categorie: REMBOURSEMENT.cle,
      paye_par: de,
      pour: a,
      est_remboursement: true,
      le: aujourdhui(),
    })
    if (error) toast(`Remboursement non enregistré : ${error.message}`)
    else toast(`Remboursement de ${euros(valeur)} enregistré.`)
    recharger()
  }

  return (
    <form onSubmit={enregistrer}>
      <p className="mb-5 text-encre-2">
        {debiteur?.prenom} rembourse {creancier?.prenom} aujourd'hui. Le montant dû est déjà rempli, modifiez-le si le
        remboursement est partiel.
      </p>
      <label className="mb-6 block">
        <span className="mb-2 block text-[0.9rem] font-semibold text-encre-2">Montant</span>
        <span className="flex items-baseline gap-2 border-b-2 border-trait focus-within:border-encre">
          <input
            className="nombre w-full bg-transparent py-1 text-[2.6rem] font-bold tracking-tight outline-none"
            inputMode="decimal"
            value={montant}
            onChange={(e) => setMontant(e.target.value.replace(/[^\d.,]/g, ''))}
            required
          />
          <span className="text-[1.8rem] font-semibold text-encre-2">€</span>
        </span>
      </label>
      <button type="submit" className="bouton bouton-principal w-full" disabled={valeur === null}>
        Enregistrer le remboursement
      </button>
    </form>
  )
}
