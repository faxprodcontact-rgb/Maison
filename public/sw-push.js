/* Mervans : affichage des notifications (chargé par le service worker de l'app) */

self.addEventListener('push', (event) => {
  let donnees = {}
  try {
    donnees = event.data ? event.data.json() : {}
  } catch {
    donnees = { titre: 'Mervans', texte: event.data ? event.data.text() : '' }
  }
  event.waitUntil(
    self.registration.showNotification(donnees.titre || 'Mervans', {
      body: donnees.texte || '',
      icon: 'icon-192.png',
      badge: 'icon-192.png',
      tag: donnees.tag,
      renotify: Boolean(donnees.tag),
      data: { url: donnees.url || './' },
    }),
  )
})

// Toucher la notification ouvre l'app sur la bonne page
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const cible = new URL((event.notification.data && event.notification.data.url) || './', self.registration.scope).href
  event.waitUntil(
    (async () => {
      const fenetres = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const fenetre of fenetres) {
        if ('focus' in fenetre) {
          await fenetre.focus()
          if ('navigate' in fenetre) {
            try {
              await fenetre.navigate(cible)
            } catch {
              /* la page reste ouverte telle quelle */
            }
          }
          return
        }
      }
      await self.clients.openWindow(cible)
    })(),
  )
})
