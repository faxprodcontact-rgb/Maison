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
- Hébergement : Vercel, mise en ligne automatique à chaque modification du dépôt.

## Mise en place

1. Exécuter `supabase/migrations/0001_init.sql` sur le projet Supabase.
2. Créer les deux comptes dans Supabase : Authentication > Users > Add user > Create new user, en cochant « Auto Confirm User ».
3. Relier chaque compte à sa personne :

   ```sql
   update public.maison_membres set user_id = (select id from auth.users where email = 'email-de-simon') where cle = 'simon';
   update public.maison_membres set user_id = (select id from auth.users where email = 'email-de-romane') where cle = 'romane';
   ```

4. Renseigner l'adresse du projet et sa clé publique dans `src/lib/config.ts`.
5. Importer le dépôt sur Vercel. Aucun réglage n'est nécessaire.

## Développement

```bash
npm install
npm run dev
```
