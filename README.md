# Maison

L'application de la maison de Simon et Romane : courses, tâches, budget et entretien, partagés en temps réel entre vos deux téléphones.

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

L'app est publiée sur GitHub Pages, dans un sous-dossier `maison` d'un dépôt public :

```bash
scripts/publier.sh ../fuze-arena-test
```

puis commit et push dans ce dépôt. Les données ne passent jamais par GitHub : elles restent dans Supabase,
protégées par les règles d'accès de la base.

## Base de données

Les scripts SQL sont dans `supabase/migrations/`, à exécuter dans l'ordre sur le projet Supabase.

## Développement

```bash
npm install
npm run dev
```
