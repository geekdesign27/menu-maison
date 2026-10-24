# Menu Maison : spécification

App familiale (Pierre-Alain, Patricia, Clara) de **gestion des menus de la semaine et des
courses du samedi matin**, en Suisse. Inspirée du fonctionnement de Planivore
(planivore.eu), sans en reprendre le code, les textes, les images ni les recettes
(CGU art. 10). Usage privé.

## Besoins de PA (2026-10-23)

1. Magasins suisses : Aldi, Lidl, Coop, Migros, Denner. Plusieurs succursales d'une même
   enseigne. Pour chaque magasin, ordonner les rayons comme dans la réalité, avec des
   exceptions par produit (tous les légumes ne sont pas au même endroit).
2. La liste de courses se réordonne quand on change de magasin.
3. Menus types (semaines habituelles), applicables en un tap.
4. On cuisine le soir pour le soir et pour le lendemain midi : nombre de personnes pour
   chacun. Quantités calculées automatiquement et additionnées (2 × poulet = plus de poulet).
5. Planifier quel jour on mange quoi.
6. Un plat pas mangé : savoir s'il est encore bon au frigo (durée de conservation par recette).
7. Recettes à liker et à garder (« Nos recettes »).
8. Courses le samedi matin : cocher ce qui est acheté, voir ce qui reste.
9. Parfaitement utilisable sur smartphone. Trois profils.
10. Un emplacement « Envies » pour noter ce qu'on a envie de manger.
11. Statistiques : quels plats, à quelle fréquence, pour varier.
12. Design sympa dans l'esprit Planivore. Prix suisses si possible (estimations en CHF,
    aucune API gratuite fiable n'existe pour Coop / Migros).

## Stack

Identique à `~/dev/evacecole` : Vite + React 19 + TypeScript + Tailwind 4, React Router
**HashRouter**, Convex (plan gratuit, temps réel), Vitest. Déploiement GitHub Pages via
GitHub Actions (`npx convex deploy` avec `CONVEX_DEPLOY_KEY`, `base` = `/menu-maison/`).
Serveurs de dev via Portly.

## Accès

- Variable d'environnement Convex `FAMILY_CODE`. Écran d'accueil : saisir le code une fois
  par appareil → mutation `access.login` → jeton de session (table `sessions`, 365 jours)
  gardé en localStorage. Toutes les fonctions prennent `token` et appellent `assertSession`.
- Garde anti-force brute (table `accessGuard`) : 5 échecs en 10 min, puis refus 10 min.
  Garde globale : un inconnu peut bloquer les **nouvelles** connexions (les téléphones déjà
  connectés ne sont pas touchés). Déblocage : `npx convex run access:resetGuard`.
- `FAMILY_CODE` : 8 caractères au minimum (refusé sinon). Choix de PA le 2026-10-24 : code court, plus facile à taper, accepté malgré le risque de devinette.
  Seule une empreinte SHA-256 du jeton est stockée, et chaque session retient l'empreinte du
  code : **changer `FAMILY_CODE` déconnecte tous les téléphones**. Révocation d'urgence :
  `npx convex run access:revokeAll`. Sessions expirées purgées chaque nuit (`crons.ts`).
- Police Nunito hébergée dans l'app (pas d'appel à Google). CSP stricte dans le build de production.
- Puis choix du profil en un tap (Pierre-Alain, Patricia, Clara), mémorisé sur l'appareil,
  changeable à tout moment. Le profil sert aux cœurs, envies, cases cochées.

## Concepts

- **Semaine de planning** : 7 jours commençant le jour des courses (`settings.shoppingDay`,
  défaut samedi = 6). La liste de courses d'une semaine couvre ses 7 jours.
- **Repas** (`meals`) : date + midi/soir + recette (ou texte libre) + personnes + `cookedOn`.
  « Ce soir 3 pers. + demain midi 2 pers. » = deux repas, même recette, même `cookedOn`.
  Repas issu de restes (`fromLeftoverOf`) : jamais sur la liste de courses.
- **Restes / frigo** : un repas « pas mangé » ou avec `leftoverPortions > 0` apparaît dans
  « Frigo » avec date limite = `cookedOn + recipe.fridgeDays`. États : bon, à manger
  aujourd'hui, périmé.
- **Liste de courses** : calculée en direct depuis les repas de la semaine (quantité par
  personne × personnes, unités normalisées g/ml/pc, additionnées par ingrédient), plus les
  articles libres. Triée par rayon selon le magasin choisi (ordre + exceptions).
  Coches synchronisées en temps réel, filtre « reste à acheter ».
- **Valider le menu de la semaine** (demande de PA, 2026-10-24) : bouton en bas de la
  Semaine. Fenêtre listant chaque ingrédient de la semaine une fois, avec la quantité
  totale, tout coché. Ce qui est décoché (« déjà à la maison ») sort entièrement de la
  liste (table `stockSkips`, par semaine), pas de quantité partielle. Ordre : ingrédients
  « souvent en stock » (`ingredients.pantry`, rayons épices, huiles, pâtes et riz,
  conserves, petit-déjeuner par défaut, modifiable dans Réglages) en haut, frais en bas.
  Dans Courses, section repliable « Déjà à la maison » avec « Remettre ».
- **Articles habituels** (demande de PA, 2026-10-24) : assortiment hors recettes (table
  `staples` : ménage, hygiène, petit-déjeuner…, 31 articles de départ). Dans Courses, la
  saisie cherche d'abord dans l'assortiment (suggestions), un article inventé y est retenu
  avec son rayon. Bouton « Articles habituels » : tout l'assortiment par rayon, un tap
  ajoute ou retire de la semaine, mode « Modifier » pour retirer de l'assortiment.
  Un même article habituel n'est jamais ajouté deux fois à la même semaine.
- **Ajouts du 2026-10-24** (demandes de PA) :
  - Quantités en pièces affichées « 3 pièces ». Quantité d'un article libre modifiable
    (bouton « ⋯ »), retenue par l'article habituel pour la fois suivante.
  - Unité « pièce » proposée pour tout ingrédient dans l'éditeur (pièces et grammes d'un
    même ingrédient restent sur deux lignes de la liste).
  - Photo de recette (`recipes.imageId`, stockage Convex), réduite à 1200 px en JPEG sur
    le téléphone avant l'envoi. Affichée à la place de l'emoji.
  - Dupliquer une recette (« … (copie) », gardée dans Nos recettes, éditeur ouvert).
  - Créneau « Matin » (petit-déjeuner) en plus de midi et soir, tag « Petit-déj » et
    5 recettes de départ. Migration `seed:addMissingRecipes` pour les bases existantes.
- **Prix** : estimation CHF par ingrédient, × `store.priceFactor`. Indicatif.
- **Stats** : nombre de fois par recette (4 et 12 dernières semaines), dernière fois,
  plats « oubliés » (aimés mais pas mangés depuis 30 jours), alerte au moment de planifier
  si la recette a été mangée dans les 7 derniers jours.

## Fichiers contrat

| Fichier | Rôle |
|---|---|
| `convex/schema.ts` | Contrat de données |
| `convex/domain/*.ts` | Logique pure partagée (front et Convex), testée avec Vitest |
| `convex/seedData.ts` | Données de départ : rayons, ingrédients, recettes, magasins (contenu original) |

## Domaine (`convex/domain/`)

- `dates.ts` : `weekStart(date, shoppingDay)`, `addDays`, `weekDays`, `zurichToday()`,
  formats français (« samedi 24 octobre »).
- `quantities.ts` : `toBase(qty, unit)`, `formatQty(qty, unit)` (arrondis lisibles :
  1250 g → « 1,25 kg », pièces arrondies au supérieur).
- `shopping.ts` : `buildShoppingList(input) → sections[]` (rayons ordonnés selon le
  magasin, articles avec quantité totale, recettes d'origine, coût estimé, clé de coche).
- `leftovers.ts` : `leftoverStatus(cookedOn, fridgeDays, today)`.
- `stats.ts` : fréquences, dernière fois, alertes de répétition.

## Règles

- Français irréprochable, typographie suisse romande (« », espace insécable avant `: ; ! ?`).
- Jamais de tiret cadratin ni demi-cadratin dans l'UI.
- Commentaires de code en anglais, textes d'interface en français.
- Mobile d'abord : cibles 44 px min, police 16 px min, une main.
- Sauvegarde à chaque action, pas de bouton « Enregistrer » sauf formulaires de recette.
- Secrets : `FAMILY_CODE` dans Convex, `CONVEX_DEPLOY_KEY` dans GitHub. `.env.local` jamais committé.
