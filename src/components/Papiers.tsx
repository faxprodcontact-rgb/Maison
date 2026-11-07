import {
  BadgeCheck,
  BookOpen,
  Calculator,
  ExternalLink,
  File,
  FileCheck2,
  FileSignature,
  FileText,
  type LucideIcon,
  Paperclip,
  Receipt,
  Upload,
} from 'lucide-react'
import { type FormEvent, useEffect, useRef, useState } from 'react'
import { aujourdhui, ecartJours, jourAvecAnnee, majuscule } from '../lib/dates'
import { envoyerFichier, supprimerFichier, tailleLisible, useUrlSignee } from '../lib/fichiers'
import { useFoyer } from '../lib/foyer'
import { table } from '../lib/supabase'
import type { CategorieDocument, Document } from '../lib/types'
import { useLive } from '../lib/useLive'
import { Sheet } from './Sheet'
import { useToast } from './Toast'
import { BoutonAjouter, Champ, Chargement, Erreur, Groupe } from './ui'

export const CATEGORIES_DOCS: { cle: CategorieDocument; nom: string; icone: LucideIcon }[] = [
  { cle: 'facture', nom: 'Facture', icone: Receipt },
  { cle: 'garantie', nom: 'Garantie', icone: BadgeCheck },
  { cle: 'attestation', nom: 'Attestation', icone: FileCheck2 },
  { cle: 'contrat', nom: 'Contrat', icone: FileSignature },
  { cle: 'devis', nom: 'Devis', icone: Calculator },
  { cle: 'notice', nom: 'Notice', icone: BookOpen },
  { cle: 'autre', nom: 'Autre', icone: File },
]

function categorie(cle: CategorieDocument) {
  return CATEGORIES_DOCS.find((c) => c.cle === cle) ?? CATEGORIES_DOCS[CATEGORIES_DOCS.length - 1]
}

type Lien = { lie_a: 'entretien' | 'projet'; lie_id: string; nom: string }

/** Texte de garantie : « Garantie jusqu'au … », en rouge quand elle se termine bientôt */
function finGarantie(d: Document): { texte: string; alerte: boolean } | null {
  if (!d.expire_le) return null
  const jours = ecartJours(aujourdhui(), d.expire_le)
  if (jours < 0) return { texte: `Garantie terminée le ${jourAvecAnnee(d.expire_le)}`, alerte: false }
  return { texte: `Garantie jusqu'au ${jourAvecAnnee(d.expire_le)}`, alerte: jours <= 60 }
}

function Vignette({ doc, grande = false }: { doc: Document; grande?: boolean }) {
  const image = doc.type_mime?.startsWith('image/')
  const url = useUrlSignee(image ? doc.chemin : null)
  const c = categorie(doc.categorie)
  if (image && url) {
    return <img src={url} alt="" className={`w-full object-cover ${grande ? 'max-h-[55vh] rounded-2xl object-contain' : 'aspect-[4/3]'}`} loading="lazy" />
  }
  return (
    <span className={`grid w-full place-items-center bg-surface-2 text-encre-2 ${grande ? 'h-48 rounded-2xl' : 'aspect-[4/3]'}`}>
      {doc.type_mime === 'application/pdf' ? <FileText size={grande ? 56 : 34} /> : <c.icone size={grande ? 56 : 34} />}
    </span>
  )
}

/** Tous les papiers de la maison */
export function OngletPapiers() {
  const [filtre, setFiltre] = useState<CategorieDocument | 'tout'>('tout')
  const [ajout, setAjout] = useState(false)
  const [ouvert, setOuvert] = useState<Document | null>(null)
  const { lignes, setLignes, erreur, recharger } = useLive<Document>('documents', () =>
    table('documents').select('*').order('cree_le', { ascending: false }),
  )
  const visibles = (lignes ?? []).filter((d) => filtre === 'tout' || d.categorie === filtre)
  const presentes = new Set((lignes ?? []).map((d) => d.categorie))

  return (
    <>
      {erreur && <Erreur message={erreur} />}
      {!lignes && !erreur && <Chargement />}

      {lignes && lignes.length > 0 && (
        <div className="flex gap-2 overflow-x-auto px-3 pb-4 [scrollbar-width:none]">
          <button type="button" className="puce shrink-0" aria-pressed={filtre === 'tout'} onClick={() => setFiltre('tout')}>
            Tout ({lignes.length})
          </button>
          {CATEGORIES_DOCS.filter((c) => presentes.has(c.cle)).map((c) => (
            <button key={c.cle} type="button" className="puce shrink-0" aria-pressed={filtre === c.cle} onClick={() => setFiltre(c.cle)}>
              <c.icone size={15} /> {c.nom}
            </button>
          ))}
        </div>
      )}

      {lignes && lignes.length === 0 && (
        <button
          type="button"
          onClick={() => setAjout(true)}
          className="mx-3 flex w-[calc(100%-1.5rem)] flex-col items-center gap-3 rounded-[1.4rem] border-2 border-dashed border-trait px-5 py-10 text-center"
        >
          <Upload size={30} className="text-encre-2" />
          <span className="text-[1.15rem] font-semibold">Ajoutez votre premier papier</span>
          <span className="text-encre-2">
            Prenez en photo une facture, une garantie ou l'attestation d'entretien de la chaudière : elle sera toujours dans votre poche.
          </span>
        </button>
      )}

      <div className="grid grid-cols-2 gap-3 px-3">
        {visibles.map((d) => {
          const c = categorie(d.categorie)
          const garantie = finGarantie(d)
          return (
            <button key={d.id} type="button" onClick={() => setOuvert(d)} className="overflow-hidden rounded-[1.3rem] bg-surface text-left">
              <Vignette doc={d} />
              <span className="block px-3 pt-2.5 pb-3">
                <span className="flex items-center gap-1 text-[0.75rem] font-semibold text-encre-2">
                  <c.icone size={13} /> {c.nom}
                </span>
                <span className="mt-0.5 line-clamp-2 block leading-snug font-semibold">{d.titre}</span>
                {garantie && (
                  <span className={`mt-1 block text-[0.75rem] ${garantie.alerte ? 'font-semibold text-retard' : 'text-encre-3'}`}>{garantie.texte}</span>
                )}
              </span>
            </button>
          )
        })}
      </div>

      <BoutonAjouter libelle="Ajouter un papier" onClick={() => setAjout(true)} />

      <Sheet ouvert={ajout} fermer={() => setAjout(false)} titre="Ajouter un papier">
        {ajout && <FormulairePapier fini={() => setAjout(false)} recharger={() => void recharger()} />}
      </Sheet>
      <FichePapier
        doc={ouvert}
        fermer={() => setOuvert(null)}
        retire={(id) => setLignes((l) => l?.filter((d) => d.id !== id) ?? l)}
      />
    </>
  )
}

/** Papiers rattachés à un entretien ou à des travaux, avec ajout */
export function PapiersLies({ lien }: { lien: Lien }) {
  const [ajout, setAjout] = useState(false)
  const [ouvert, setOuvert] = useState<Document | null>(null)
  const { lignes, setLignes, recharger } = useLive<Document>(
    'documents',
    () => table('documents').select('*').eq('lie_a', lien.lie_a).eq('lie_id', lien.lie_id).order('cree_le', { ascending: false }),
    [lien.lie_id],
  )

  return (
    <div className="mt-6">
      <h3 className="mb-2 flex items-center gap-2 font-semibold text-encre-2">
        <Paperclip size={16} /> Papiers
      </h3>
      {(lignes ?? []).length > 0 && (
        <ul className="mb-3 grid gap-2">
          {(lignes ?? []).map((d) => {
            const c = categorie(d.categorie)
            return (
              <li key={d.id}>
                <button type="button" onClick={() => setOuvert(d)} className="flex w-full items-center gap-3 rounded-2xl bg-fond px-3 py-2.5 text-left">
                  <c.icone size={18} className="shrink-0 text-encre-2" />
                  <span className="min-w-0 flex-1 truncate">{d.titre}</span>
                  <span className="text-[0.8rem] text-encre-3">{c.nom}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
      {ajout ? (
        <div className="rounded-2xl bg-fond p-3">
          <FormulairePapier lienFixe={lien} fini={() => setAjout(false)} recharger={() => void recharger()} />
        </div>
      ) : (
        <button type="button" className="bouton bouton-secondaire w-full !py-2.5" onClick={() => setAjout(true)}>
          <Upload size={17} /> Joindre une facture, un devis…
        </button>
      )}
      <FichePapier doc={ouvert} fermer={() => setOuvert(null)} retire={(id) => setLignes((l) => l?.filter((d) => d.id !== id) ?? l)} />
    </div>
  )
}

function FichePapier({ doc, fermer, retire }: { doc: Document | null; fermer: () => void; retire: (id: string) => void }) {
  const toast = useToast()
  const { membre } = useFoyer()
  const url = useUrlSignee(doc?.chemin)
  const [confirmer, setConfirmer] = useState(false)
  useEffect(() => setConfirmer(false), [doc?.id])

  async function supprimer() {
    if (!doc) return
    fermer()
    retire(doc.id)
    const { error } = await table('documents').delete().eq('id', doc.id)
    if (error) return toast(`Suppression impossible : ${error.message}`)
    await supprimerFichier(doc.chemin)
    toast('Papier supprimé.')
  }

  const garantie = doc ? finGarantie(doc) : null
  return (
    <Sheet ouvert={doc !== null} fermer={fermer} titre={doc?.titre ?? ''}>
      {doc && (
        <div>
          <Vignette doc={doc} grande />
          <a
            href={url ?? undefined}
            target="_blank"
            rel="noopener noreferrer"
            className={`bouton bouton-principal mt-4 w-full ${url ? '' : 'pointer-events-none opacity-50'}`}
          >
            <ExternalLink size={18} /> Ouvrir {doc.type_mime === 'application/pdf' ? 'le PDF' : 'en grand'}
          </a>
          <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-5 gap-y-2">
            <dt className="text-encre-2">Type</dt>
            <dd>{categorie(doc.categorie).nom}</dd>
            {doc.date_doc && (
              <>
                <dt className="text-encre-2">Date</dt>
                <dd>{jourAvecAnnee(doc.date_doc)}</dd>
              </>
            )}
            {garantie && (
              <>
                <dt className="text-encre-2">Garantie</dt>
                <dd className={garantie.alerte ? 'font-semibold text-retard' : ''}>{garantie.texte.replace('Garantie ', '')}</dd>
              </>
            )}
            <dt className="text-encre-2">Ajouté par</dt>
            <dd>
              {membre(doc.ajoute_par)?.prenom ?? '?'}, le {jourAvecAnnee(doc.cree_le.slice(0, 10))}
              {doc.taille ? ` (${tailleLisible(doc.taille)})` : ''}
            </dd>
          </dl>
          {doc.notes && <p className="mt-4 rounded-xl bg-fond px-4 py-3 whitespace-pre-line">{doc.notes}</p>}
          {confirmer ? (
            <div className="mt-6 flex gap-3">
              <button type="button" className="bouton bouton-secondaire flex-1" onClick={() => setConfirmer(false)}>
                Garder
              </button>
              <button type="button" className="bouton flex-1 bg-retard text-white" onClick={() => void supprimer()}>
                Supprimer
              </button>
            </div>
          ) : (
            <button type="button" className="bouton bouton-danger mt-4" onClick={() => setConfirmer(true)}>
              Supprimer ce papier
            </button>
          )}
        </div>
      )}
    </Sheet>
  )
}

function FormulairePapier({ lienFixe, fini, recharger }: { lienFixe?: Lien; fini: () => void; recharger: () => void }) {
  const { moi } = useFoyer()
  const toast = useToast()
  const choix = useRef<HTMLInputElement>(null)
  const [fichier, setFichier] = useState<File | null>(null)
  const [apercu, setApercu] = useState<string | null>(null)
  const [titre, setTitre] = useState('')
  const [cat, setCat] = useState<CategorieDocument>(lienFixe?.lie_a === 'projet' ? 'devis' : lienFixe ? 'attestation' : 'facture')
  const [dateDoc, setDateDoc] = useState(aujourdhui())
  const [expire, setExpire] = useState('')
  const [notes, setNotes] = useState('')
  const [lien, setLien] = useState(lienFixe ? `${lienFixe.lie_a}:${lienFixe.lie_id}` : '')
  const [envoi, setEnvoi] = useState(false)
  const { lignes: entretiens } = useLive<{ id: string; titre: string }>('entretien', () => table('entretien').select('id, titre').order('titre'))
  const { lignes: projets } = useLive<{ id: string; titre: string }>('projets', () =>
    table('projets').select('id, titre').eq('genre', 'travaux').order('titre'),
  )

  useEffect(() => {
    if (!fichier || !fichier.type.startsWith('image/')) {
      setApercu(null)
      return
    }
    const url = URL.createObjectURL(fichier)
    setApercu(url)
    return () => URL.revokeObjectURL(url)
  }, [fichier])

  async function enregistrer(e: FormEvent) {
    e.preventDefault()
    if (!fichier || !titre.trim()) return
    setEnvoi(true)
    try {
      const envoye = await envoyerFichier(fichier, 'papiers')
      const [lieA, lieId] = lien ? lien.split(':') : [null, null]
      const { error } = await table('documents').insert({
        titre: majuscule(titre.trim()),
        categorie: cat,
        chemin: envoye.chemin,
        type_mime: envoye.type,
        taille: envoye.taille,
        lie_a: lieA,
        lie_id: lieId,
        date_doc: dateDoc || null,
        expire_le: cat === 'garantie' && expire ? expire : null,
        notes: notes.trim() || null,
        ajoute_par: moi.cle,
      })
      if (error) {
        await supprimerFichier(envoye.chemin)
        throw new Error(error.message)
      }
      toast('Papier rangé.')
      fini()
      recharger()
    } catch (erreur) {
      toast(`Envoi impossible : ${(erreur as Error).message}`)
    } finally {
      setEnvoi(false)
    }
  }

  return (
    <form onSubmit={enregistrer}>
      <input
        ref={choix}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null
          setFichier(f)
          e.target.value = ''
        }}
      />
      <button
        type="button"
        onClick={() => choix.current?.click()}
        className="mb-5 flex w-full flex-col items-center gap-2 overflow-hidden rounded-2xl border-2 border-dashed border-trait bg-surface px-4 py-5 text-center"
      >
        {apercu ? (
          <img src={apercu} alt="Aperçu" className="max-h-44 rounded-xl" />
        ) : fichier ? (
          <FileText size={30} className="text-encre-2" />
        ) : (
          <Upload size={28} className="text-encre-2" />
        )}
        <span className="font-semibold">{fichier ? fichier.name : 'Prendre une photo ou choisir un fichier'}</span>
        <span className="text-[0.85rem] text-encre-3">{fichier ? `${tailleLisible(fichier.size)}, touchez pour changer` : 'Photo ou PDF'}</span>
      </button>

      <Champ etiquette="Nom du papier">
        <input className="champ" value={titre} onChange={(e) => setTitre(e.target.value)} placeholder="Ex. Facture du lave-linge" required />
      </Champ>
      <Groupe etiquette="Type">
        <div className="flex flex-wrap gap-2">
          {CATEGORIES_DOCS.map((c) => (
            <button key={c.cle} type="button" className="puce" aria-pressed={cat === c.cle} onClick={() => setCat(c.cle)}>
              <c.icone size={15} /> {c.nom}
            </button>
          ))}
        </div>
      </Groupe>
      <Champ etiquette="Date du papier">
        <input type="date" className="champ" value={dateDoc} onChange={(e) => setDateDoc(e.target.value)} />
      </Champ>
      {cat === 'garantie' && (
        <Champ etiquette="Garantie valable jusqu'au" aide="L'app vous préviendra un mois avant la fin.">
          <input type="date" className="champ" value={expire} onChange={(e) => setExpire(e.target.value)} />
        </Champ>
      )}
      {!lienFixe && (
        <Champ etiquette="Lié à (facultatif)">
          <select className="champ" value={lien} onChange={(e) => setLien(e.target.value)}>
            <option value="">Rien en particulier</option>
            {(entretiens ?? []).length > 0 && (
              <optgroup label="Entretien">
                {(entretiens ?? []).map((e) => (
                  <option key={e.id} value={`entretien:${e.id}`}>
                    {e.titre}
                  </option>
                ))}
              </optgroup>
            )}
            {(projets ?? []).length > 0 && (
              <optgroup label="Travaux">
                {(projets ?? []).map((p) => (
                  <option key={p.id} value={`projet:${p.id}`}>
                    {p.titre}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </Champ>
      )}
      <Champ etiquette="Notes">
        <textarea className="champ min-h-16" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex. numéro de série, magasin" />
      </Champ>
      <div className="flex gap-3">
        {lienFixe && (
          <button type="button" className="bouton bouton-secondaire" onClick={fini}>
            Annuler
          </button>
        )}
        <button type="submit" className="bouton bouton-principal flex-1" disabled={!fichier || !titre.trim() || envoi}>
          {envoi ? 'Envoi…' : 'Ranger ce papier'}
        </button>
      </div>
    </form>
  )
}
