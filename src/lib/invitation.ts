// Code du foyer reçu par un lien d'invitation (…/maison/?code=XXXX-XXXX).
// Il est gardé sur le téléphone le temps de créer son compte et de rejoindre le foyer.

const CLE = 'maison-code-foyer'

function lireStockage(): string | null {
  try {
    return localStorage.getItem(CLE)
  } catch {
    return null
  }
}

export function codeInvitation(): string {
  const depuisLien = new URLSearchParams(window.location.search).get('code')
  if (depuisLien) {
    try {
      localStorage.setItem(CLE, depuisLien)
    } catch {
      // stockage indisponible : le code reste dans l'adresse
    }
    return depuisLien
  }
  return lireStockage() ?? ''
}

export function oublierInvitation() {
  try {
    localStorage.removeItem(CLE)
  } catch {
    // rien à faire
  }
  if (window.location.search) {
    window.history.replaceState(null, '', window.location.pathname + window.location.hash)
  }
}
