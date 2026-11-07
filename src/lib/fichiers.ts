import { useEffect, useState } from 'react'
import { PREFIXE, supabase } from './supabase'

const BAC = 'mervans'
const DOSSIER = PREFIXE === 'essai_' ? 'essai' : 'maison'

/** Réduit une photo (2000 px max, JPEG) pour économiser l'espace et accélérer l'envoi. */
async function compresser(fichier: File): Promise<Blob> {
  if (!fichier.type.startsWith('image/') || fichier.type === 'image/gif') return fichier
  try {
    const image = await createImageBitmap(fichier)
    const echelle = Math.min(1, 2000 / Math.max(image.width, image.height))
    const toile = document.createElement('canvas')
    toile.width = Math.round(image.width * echelle)
    toile.height = Math.round(image.height * echelle)
    toile.getContext('2d')?.drawImage(image, 0, 0, toile.width, toile.height)
    const blob = await new Promise<Blob | null>((ok) => toile.toBlob(ok, 'image/jpeg', 0.82))
    return blob && blob.size < fichier.size ? blob : fichier
  } catch {
    return fichier // format que le navigateur ne sait pas lire (HEIC sur ordinateur…) : envoyé tel quel
  }
}

export type FichierEnvoye = { chemin: string; type: string; taille: number }

export async function envoyerFichier(fichier: File, sousDossier: 'mots' | 'papiers'): Promise<FichierEnvoye> {
  const contenu = await compresser(fichier)
  const type = contenu.type || fichier.type || 'application/octet-stream'
  const extension = type === 'application/pdf' ? 'pdf' : type === 'image/png' ? 'png' : type.startsWith('image/heic') ? 'heic' : 'jpg'
  const chemin = `${DOSSIER}/${sousDossier}/${crypto.randomUUID()}.${extension}`
  const { error } = await supabase.storage.from(BAC).upload(chemin, contenu, { contentType: type, upsert: false })
  if (error) throw new Error(error.message)
  return { chemin, type, taille: contenu.size }
}

export async function supprimerFichier(chemin: string) {
  await supabase.storage.from(BAC).remove([chemin])
}

const cache = new Map<string, { url: string; expire: number }>()

/** Lien temporaire (1 h) vers un fichier privé */
export async function urlSignee(chemin: string): Promise<string | null> {
  const enCache = cache.get(chemin)
  if (enCache && enCache.expire > Date.now()) return enCache.url
  const { data, error } = await supabase.storage.from(BAC).createSignedUrl(chemin, 3600)
  if (error || !data) return null
  cache.set(chemin, { url: data.signedUrl, expire: Date.now() + 50 * 60 * 1000 })
  return data.signedUrl
}

export function useUrlSignee(chemin: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(chemin ? (cache.get(chemin)?.url ?? null) : null)
  useEffect(() => {
    let actif = true
    if (!chemin) {
      setUrl(null)
      return
    }
    void urlSignee(chemin).then((u) => {
      if (actif) setUrl(u)
    })
    return () => {
      actif = false
    }
  }, [chemin])
  return url
}

export function tailleLisible(octets: number | null | undefined): string {
  if (!octets) return ''
  if (octets < 1024 * 1024) return `${Math.max(1, Math.round(octets / 1024))} Ko`
  return `${(octets / 1024 / 1024).toFixed(1).replace('.', ',')} Mo`
}
