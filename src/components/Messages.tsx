import { AlertCircle, CheckCheck, Heart, MessageCircle, Send, X } from 'lucide-react'
import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { ajouterJours, aujourdhui, jourRelatif, versISO } from '../lib/dates'
import { useFoyer } from '../lib/foyer'
import { table } from '../lib/supabase'
import type { Importance, Message } from '../lib/types'
import { useLive } from '../lib/useLive'
import { useToast } from './Toast'
import { Pastille } from './ui'

const NIVEAUX: { cle: Importance; nom: string; icone: typeof Heart }[] = [
  { cle: 'doux', nom: 'Mot doux', icone: Heart },
  { cle: 'normal', nom: 'À savoir', icone: MessageCircle },
  { cle: 'important', nom: 'Important', icone: AlertCircle },
]

function quand(iso: string): string {
  const d = new Date(iso)
  const heure = d.toLocaleTimeString('fr-FR', { hour: 'numeric', minute: '2-digit' }).replace(':', ' h ')
  const jour = versISO(d)
  if (jour === aujourdhui()) return `à ${heure}`
  return `${jourRelatif(jour)} à ${heure}`
}

/** Les petits mots laissés l'un à l'autre dans la journée */
export function Messages() {
  const { moi, autre, membre } = useFoyer()
  const toast = useToast()
  const [texte, setTexte] = useState('')
  const [importance, setImportance] = useState<Importance>('doux')
  const zone = useRef<HTMLTextAreaElement>(null)
  const depuis = ajouterJours(aujourdhui(), -7)

  const { lignes, setLignes, recharger } = useLive<Message>('messages', () =>
    table('messages').select('*').gte('cree_le', depuis).order('cree_le', { ascending: false }).limit(40),
  )

  // Les mots de l'autre sont marqués « vus » dès qu'ils s'affichent
  const nonLus = useMemo(() => (lignes ?? []).filter((m) => m.de !== moi.cle && !m.lu_le).map((m) => m.id), [lignes, moi.cle])
  useEffect(() => {
    if (nonLus.length === 0 || document.visibilityState !== 'visible') return
    // Une requête Supabase ne part que lorsqu'on attend son résultat
    void table('messages')
      .update({ lu_le: new Date().toISOString() })
      .in('id', nonLus)
      .then(() => undefined)
  }, [nonLus])

  async function envoyer(e: FormEvent) {
    e.preventDefault()
    const propre = texte.trim()
    if (!propre) return
    const nouveau: Message = {
      id: crypto.randomUUID(),
      de: moi.cle,
      texte: propre,
      importance,
      cree_le: new Date().toISOString(),
      lu_le: null,
    }
    setLignes((l) => [nouveau, ...(l ?? [])])
    setTexte('')
    const { error } = await table('messages').insert({ id: nouveau.id, de: nouveau.de, texte: nouveau.texte, importance })
    if (error) {
      toast(`Message non envoyé : ${error.message}`)
      setTexte(propre)
      void recharger()
    }
  }

  async function effacer(m: Message) {
    setLignes((l) => l?.filter((x) => x.id !== m.id) ?? l)
    const { error } = await table('messages').delete().eq('id', m.id)
    if (error) {
      toast(`Suppression impossible : ${error.message}`)
      void recharger()
    }
  }

  return (
    <section aria-labelledby="titre-mots" className="px-3">
      <h2 id="titre-mots" className="px-2 pb-3 font-[family-name:var(--font-main)] text-[2rem] leading-none font-bold">
        Petits mots
      </h2>

      <form onSubmit={envoyer} className="rounded-[1.4rem] bg-surface p-3 shadow-[0_8px_24px_-18px_rgb(0_0_0/0.5)]">
        <label className="sr-only" htmlFor="mot">
          Message pour {autre.prenom}
        </label>
        <textarea
          id="mot"
          ref={zone}
          value={texte}
          onChange={(e) => setTexte(e.target.value)}
          rows={2}
          maxLength={500}
          placeholder={`Un mot pour ${autre.prenom}…`}
          className="w-full resize-none bg-transparent px-2 pt-1 font-[family-name:var(--font-main)] text-[1.55rem] leading-tight outline-none placeholder:text-encre-3"
        />
        <div className="flex items-center gap-1.5">
          <div role="radiogroup" aria-label="Type de message" className="flex flex-1 flex-wrap gap-1">
            {NIVEAUX.map((n) => (
              <button
                key={n.cle}
                type="button"
                role="radio"
                aria-checked={importance === n.cle}
                onClick={() => setImportance(n.cle)}
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[0.82rem] font-semibold transition-colors ${
                  importance === n.cle ? 'niveau-actif' : 'text-encre-2'
                }`}
                data-niveau={n.cle}
              >
                <n.icone size={15} fill={n.cle === 'doux' && importance === 'doux' ? 'currentColor' : 'none'} />
                {n.nom}
              </button>
            ))}
          </div>
          <button
            type="submit"
            disabled={!texte.trim()}
            aria-label={`Envoyer à ${autre.prenom}`}
            className="grid size-11 shrink-0 place-items-center rounded-full bg-encre text-fond transition-opacity disabled:opacity-30"
          >
            <Send size={19} />
          </button>
        </div>
      </form>

      {lignes && lignes.length === 0 && (
        <p className="px-2 pt-4 text-encre-2">
          Laissez un mot à {autre.prenom} : un « bonne journée », ou « n'oublie pas le drive ». Il s'affichera ici, chez vous
          deux.
        </p>
      )}

      <ul className="mt-4 grid gap-3">
        {(lignes ?? []).map((m) => {
          const deMoi = m.de === moi.cle
          const auteur = membre(m.de)
          const niveau = NIVEAUX.find((n) => n.cle === m.importance) ?? NIVEAUX[1]
          return (
            <li key={m.id} className={`flex ${deMoi ? 'justify-end pl-8' : 'justify-start pr-8'}`}>
              <article className="mot relative w-full rounded-[1.3rem] px-4 pt-3 pb-3" data-niveau={m.importance}>
                <header className="flex items-center gap-2 text-[0.82rem] text-encre-2">
                  <Pastille cle={m.de} taille={18} decoratif />
                  <span className="font-semibold text-encre">{deMoi ? 'Vous' : auteur?.prenom}</span>
                  <span>{quand(m.cree_le)}</span>
                  {m.importance !== 'normal' && (
                    <span className="mot-etiquette ml-auto inline-flex items-center gap-1 font-semibold">
                      <niveau.icone size={13} fill={m.importance === 'doux' ? 'currentColor' : 'none'} />
                      {niveau.nom}
                    </span>
                  )}
                </header>
                <p className="mt-1 font-[family-name:var(--font-main)] text-[1.6rem] leading-[1.15] break-words whitespace-pre-line">
                  {m.texte}
                </p>
                <footer className="mt-1 flex items-center justify-end gap-2 text-[0.78rem] text-encre-3">
                  {deMoi && m.lu_le && (
                    <span className="inline-flex items-center gap-1">
                      <CheckCheck size={14} /> Vu par {autre.prenom}
                    </span>
                  )}
                  {deMoi && (
                    <button
                      type="button"
                      onClick={() => void effacer(m)}
                      className="-mr-2 grid size-8 place-items-center rounded-full"
                      aria-label="Effacer ce message"
                    >
                      <X size={15} />
                    </button>
                  )}
                </footer>
              </article>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
