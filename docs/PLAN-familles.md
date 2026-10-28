# Plan : Menu Maison pour plusieurs familles

État : validé par PA le 2026-10-27. Lot D en production (menumaison.ch). Lot A1 en
production le 2026-10-28 : famille Schütz migrée (456 documents, aucun sans famille),
sauvegarde dans `backups/prod-avant-familles-2026-10-28.zip`. Étape 3 (`familyId`
obligatoire) déployée le même jour. Lot A2 en partie : l'admin choisit les pseudos, crée
les liens d'activation et de mot de passe oublié, et nomme la famille (qui donne le lien).
Reste de A2 : rôle admin ou membre réglable, changer son propre mot de passe. Lot B en
production le 2026-10-28 : onglet « Familles » de `/gestion` (créer, nouveau lien d'admin,
suspendre). Pas encore : supprimer une famille. Lot E (thèmes et polices) et fin de A2 (rôles, onglet « Famille » de la gestion) le même
jour. Prochain : lot C (budget IA) avant tout pote.

## Décisions de PA (2026-10-27)

- Une seule app, un espace par famille, données strictement séparées.
- Un **pseudo et un mot de passe par personne**. L'admin de la famille (le pote) crée et
  règle les comptes de sa famille. Pas d'e-mail.
- PA est super-admin : il crée les familles et leur premier compte.
- Chaque nouvelle famille reçoit une copie du catalogue de départ (`seedData.ts`).
- Plafond Claude par défaut : 2 USD par famille et par mois, réglable par PA.
- **3 thèmes de couleurs** et **un choix de polices Google** par famille.
- Nom de domaine **menumaison.ch** (Infomaniak), validé et acheté.

## Modèle

- `families` : nom, identifiant court (`schutz`, `dupont`), thème, police, plafond,
  suspendue ou non.
- `members` (existe) : chaque profil reçoit `familyId`, et en option un **pseudo**, un
  **mot de passe** (haché PBKDF2-SHA256, sel par compte) et un **rôle** (`admin` ou
  `membre`). Un profil sans pseudo reste un simple profil (petit enfant), comme
  aujourd'hui.
- `members.superadmin` : vrai pour PA, qui gère toutes les familles.
- Toutes les autres tables reçoivent `familyId`, et chaque index commence par `familyId`
  (`ingredients.by_family_name`, `meals.by_family_date`…).
- `sessions` : jeton haché comme aujourd'hui, plus le membre et la famille. Le code
  famille (`FAMILY_CODE`) disparaît.
- Protection contre les essais répétés : par famille et par pseudo (5 essais, puis
  blocage de 10 min), au lieu d'un seul compteur global.

## Connexion

- Chaque famille a son lien : `menumaison.ch/#/f/dupont`. La page de connexion affiche le
  nom de la famille et demande pseudo et mot de passe. Le lien s'ajoute à l'écran
  d'accueil comme aujourd'hui.
- Le pseudo est unique dans sa famille (deux familles peuvent avoir une « clara »).
- Mot de passe : 8 caractères au moins. L'admin de la famille le règle et peut le
  réinitialiser ; chacun peut changer le sien.
- Le choix du profil au démarrage disparaît pour qui a un compte : on est connecté en
  tant que soi.

## Sécurité : la règle qui prime

- Une seule porte d'entrée : `requireMember(ctx, token)` renvoie `{ memberId, familyId,
  role }`. Toute fonction publique l'appelle, puis ne lit et n'écrit qu'avec ce
  `familyId`.
- Tout document reçu par son identifiant est vérifié : s'il appartient à une autre
  famille, la fonction répond « introuvable ».
- **Tests d'isolation automatiques** (`convex-test`) : deux familles, et pour chaque
  fonction publique, la famille B ne peut ni lire, ni modifier, ni supprimer ce qui
  appartient à la famille A. Ces tests bloquent le commit s'ils échouent.
- Revue de sécurité avant chaque mise en production.

## Thèmes et polices

- 3 thèmes : **Carotte** (l'actuel), **Sauge** (vert doux), **Myrtille** (bleu-violet).
  Ils changent les variables de couleur déjà en place (`--color-carrot`…) ; aucun écran
  n'est réécrit. Contraste vérifié pour chaque thème (texte sur fond, boutons).
- Polices : 4 polices Google au choix (Nunito l'actuelle, Quicksand, Lexend, Atkinson
  Hyperlegible, très lisible). Servies depuis l'app (paquets Fontsource), pas depuis
  les serveurs de Google : aucune adresse IP des familles ne part chez Google, et seule
  la police choisie est téléchargée.
- Réglé par l'admin de la famille dans Réglages, avec un aperçu.

## Lots, dans l'ordre

| Lot | Contenu | Vérification |
|---|---|---|
| D | Domaine menumaison.ch : DNS chez Infomaniak (PA), domaine dans GitHub Pages, base de l'app à `/` | site servi en https sur menumaison.ch, ancienne adresse redirigée |
| A1 | Familles, comptes, `familyId` partout, isolation, migration de la famille Schütz | tests d'isolation, migration répétée sur une copie locale, production inchangée pour vous |
| A2 | Gestion des membres par l'admin famille (créer, pseudo, mot de passe, rôle), changer son mot de passe | tests, parcours dans l'app |
| B | Espace super-admin de PA : créer une famille et son admin, lien à envoyer, suspendre, réinitialiser | tests, création d'une famille de test |
| E | Thèmes et polices | captures des 3 thèmes, contraste mesuré |
| C | Compteurs d'usage par famille, coût estimé, plafond mensuel | tests, compteurs après un ticket et un import |

Puis les lots 3 (articles habituels) et 4 (dépenses) déjà prévus.

## Migration de la famille actuelle (A1)

1. Schéma avec `familyId` facultatif, déployé.
2. Migration : création de la famille « Schütz » (`schutz`), tous les documents
   rattachés, comptes de Pierre-Alain (admin et super-admin), Patricia et Clara avec
   des mots de passe provisoires que PA transmet.
3. Schéma avec `familyId` obligatoire, déployé.
4. Chaque téléphone se reconnecte une fois avec son pseudo.

Répétée d'abord sur le déploiement local avec une copie des données de production.

## Risques

- Oubli d'un filtre famille dans une fonction : couvert par les tests d'isolation.
- Coupure pendant la migration : la migration est rejouable, la production n'est
  touchée qu'après validation locale.
- Coûts Convex : la consommation réelle de la famille Schütz est à relever dans le
  tableau de bord avant d'inviter les potes.
