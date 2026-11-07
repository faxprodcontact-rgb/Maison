# Mervans

L'application de la maison de Simon et Romane : courses, tâches, budget et entretien, partagés en temps réel entre vos deux téléphones. Logo : `design/logo-mervans.svg`.

## Ce que fait l'app

- **Accueil** : les tâches du jour, la liste de courses, les dépenses du mois et le prochain entretien en un coup d'œil.
- **Courses** : liste partagée rangée par rayon. L'app devine le rayon (« 2 baguettes » va en Boulangerie), retient vos corrections et propose les articles achetés souvent.
- **Tâches** : qui s'en occupe (Simon, Romane ou nous deux), échéance, répétition. Une tâche répétée revient toute seule une fois cochée.
- **Budget** : dépenses par catégorie, qui a payé, et qui doit combien à qui. Une dépense « pour nous deux » est partagée moitié-moitié.
- **Entretien** : chaudière, ramonage, contrôle technique, assurances… avec la fréquence, l'historique et les coûts.

## Technique

- React + TypeScript, construit avec Vite, installable sur téléphone (PWA).
- Données dans Supabase, projet « Application Personnel », partagé avec d'autres apps : toutes les tables sont préfixées `maison_`.
- Seuls les comptes reliés dans `maison_membres` peuvent lire ou modifier les données.
- Hébergement : GitHub Pages (voir « Mise en ligne »).

## Comptes

Chacun crée son compte depuis l'app (« Créer un compte »), puis entre le **code du foyer** et choisit qui il est.
Le code n'est pas dans ce dépôt : il est enregistré haché dans la base (voir `supabase/migrations/0002_rejoindre_le_foyer.sql`
pour le changer). Une fois Simon et Romane inscrits, plus personne ne peut rejoindre le foyer, même avec le code.

Un lien d'invitation pré-remplit le code : `…/maison/?code=XXXX-XXXX`.

## Mise en ligne

L'app est publiée sur GitHub Pages : https://faxprodcontact-rgb.github.io/Maison/

Chaque modification poussée sur `main` est mise en ligne automatiquement (`.github/workflows/mise-en-ligne.yml`).
Les données ne passent jamais par GitHub : elles restent dans Supabase, protégées par les règles d'accès de la base.

## Notifications

Les notifications (petits mots, réactions, questions et réponses de l'agenda, résumé du matin à 8 h)
passent par la fonction Supabase `supabase/functions/mervans-notifications`, appelée par la base
(`supabase/migrations/0005_notifications.sql`, extensions `pg_net` et `pg_cron`).
Les clés de signature (VAPID) et le secret partagé sont dans le coffre-fort Supabase (Vault) :
ils ne sont ni dans ce dépôt, ni dans l'app. Chacun active les notifications dans Réglages.

## Base de données

Les scripts SQL sont dans `supabase/migrations/`, à exécuter dans l'ordre sur le projet Supabase.

## Développement

```bash
npm install
npm run dev
```
