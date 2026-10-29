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

## Demandes de PA (2026-10-24)

1. **Lot 1, page « Produits »** (`/produits`, depuis « Plus ») : ingrédients et articles
   hors recette dans une seule liste, recherche, filtres (type, rayon, enseigne, sans prix,
   sans photo), modification par les fiches existantes, suppression d'un ingrédient
   seulement si aucune recette (archivées comprises) ne l'utilise.
2. **Lot 2, gestion sur ordinateur** (`/gestion`, onglet visible sur grand écran) : même
   code famille, menu latéral, tableaux triables (recettes, produits, rayons, magasins).
   Les fiches s'ouvrent en panneau à droite ; l'éditeur de recette passe sur deux colonnes.
3. **Lot 3, Open Food Facts** : chercher un produit depuis l'éditeur de recette ou la fiche
   d'un produit, importer photo, allergènes et nutrition. L'ingrédient reste générique
   (« Spaghetti ») et achetable partout : ni marque ni enseigne imposée. Pas de doublon
   (code-barres, puis nom). Allergènes et calories par portion affichés sur la recette.
   Recherche via `search.openfoodfacts.org` (l'ancienne recherche répond 503), en Suisse
   d'abord, 800 ms après la frappe et 3 lettres minimum (limite d'environ 10 recherches
   par minute). La photo n'est importée que si l'ingrédient n'en a pas. Données parfois
   incomplètes : l'app dit « aucun indiqué » et rappelle de vérifier l'emballage.
   Calories : g et ml comptés pareil, c. à s. = 15 g, c. à c. = 5 g ; les pièces ne
   comptent pas (calcul affiché comme partiel).
4. **Lot 4, tickets de caisse** (`/courses/ticket`, bouton sur Courses) : photo lue par
   Claude Opus 5.5 (effort low, repli serveur activé, environ 0,09 USD par ticket mesuré),
   écran de vérification, puis prix par enseigne (table `chainPrices`, dernier prix vu,
   date du ticket) et alias de libellés par enseigne (`receiptAliases`, avec le contenu du
   paquet). Produits pesés : prix au kilo exact ; paquets : contenu demandé une fois.
   Achats hors liste : ignorés ou ajoutés aux articles habituels. La photo n'est pas
   gardée, les lignes ressemblant à un numéro de carte sont écartées. Les estimations
   (liste, coût des recettes) prennent le prix de l'enseigne du magasin choisi avant
   l'estimation × coefficient.

## Demandes de PA (2026-10-24, suite)

1. **Lot 1, importer une recette** (`/recette/importer`, bouton « Nouvelle » des
   Recettes, bouton « Importer » de la gestion) : un lien (Fooby, Betty Bossi, Marmiton…,
   même partagé avec son titre depuis iOS) ou le texte d'une recette. Le serveur lit la
   fiche schema.org de la page (JSON-LD), sinon son texte, puis Claude Opus 5.5 (effort
   low) en fait un brouillon en français : quantités ramenées à une portion (portions du
   site, sinon celles lues par Claude, sinon le foyer), étapes, styles, temps, conservation.
   Ingrédients : ceux du catalogue d'abord (clé du catalogue, puis même nom), les autres
   proposés « Nouveau » avec rayon et unité, créés à l'enregistrement (sans doublon). Les
   cuillères deviennent des ml, ou des g estimés (« À vérifier ») ; sans conversion sûre,
   la quantité est laissée à saisir. Le brouillon s'ouvre dans l'éditeur de recette, la
   ligne d'origine sous chaque ingrédient. Photo du site importée (JPEG, PNG, WebP,
   4 Mo max), lien d'origine gardé (`recipes.sourceUrl`) et affiché sur la recette.
   Sécurité : https seulement, ni IP, ni nom local, ni port ; redirections revérifiées.
2. **Lot 2, dicter une recette** (même écran « Dicter ou importer ») : gros bouton micro,
   5 minutes au plus, « Terminer » ou « Annuler ». L'audio passe par le stockage Convex,
   est transcrit en français par Groq Whisper large-v3 (offre gratuite, clé
   `GROQ_API_KEY`) puis supprimé aussitôt. Le texte s'affiche dans le champ (corrigeable
   si la préparation échoue) et donne le même brouillon que le lot 1. Seul l'audio part
   chez Groq ; seule la taille est écrite dans les logs.
3. **Lot 3, articles habituels** : page à part dans « Plus », tous les articles, fiches
   complètes, ajout aux courses en un tap.
4. **Lot 4, dépenses** : tickets enregistrés (date, enseigne, total, lignes avec rayon),
   statistiques par semaine, par rayon et par enseigne.

## Stack

Identique à `~/dev/evacecole` : Vite + React 19 + TypeScript + Tailwind 4, React Router
**HashRouter**, Convex (plan gratuit, temps réel), Vitest. Déploiement GitHub Pages via
GitHub Actions (`npx convex deploy` avec `CONVEX_DEPLOY_KEY`, `base` = `/menu-maison/`).
Serveurs de dev via Portly.

## Accès (plusieurs familles, depuis le 2026-10-27)

- Une seule app pour plusieurs familles (`families`). Chaque ligne des autres tables porte
  `familyId`. Plan et décisions : [PLAN-familles.md](PLAN-familles.md).
- **Isolation** : toute fonction publique appelle `requireMember` / `requireMemberWriter`
  (`convex/lib.ts`) et n'utilise que la base filtrée qu'ils renvoient : lectures par index
  commençant par `familyId`, document d'une autre famille traité comme inexistant,
  identifiants reçus vérifiés par `db.own` / `db.ownAll`. `ctx.db` direct est réservé aux
  tables sans famille (sessions, invitations, gardes) et aux tâches internes.
  `convex/isolation.test.ts` met deux familles face à face et échoue si une fonction
  publique n'est ni testée ni justifiée.
- **Comptes** : pseudo et mot de passe par personne (`members.username`, unique dans la
  famille, minuscules sans accent ; `members.passwordHash`, PBKDF2-SHA256 600 000
  itérations, sel par compte). Rôles `admin` / `membre`, `superadmin` pour PA. Un profil sans
  pseudo (petit enfant) ne se connecte pas.
- **Nom de la famille** : choisi par l'admin dans Réglages (`families.rename`), il donne
  aussi le lien de connexion : « Schütz » → `menumaison.ch/#/f/schutz` (`slugFromName`).
  Renommer change le lien ; les téléphones connectés le sont toujours et retiennent le
  nouveau. Le nom est unique entre les familles.
- **Connexion** : lien de la famille (mémorisé sur le téléphone) ou nom de la famille tapé à
  la main (« Schütz », « Famille Schütz » ou « schutz »), pseudo, mot de passe → action
  `access.login` → jeton de session (365 jours, empreinte SHA-256 seule en base). 5 échecs
  en 10 min sur un même pseudo : blocage 5 min ; 30 essais par minute pour tout le site
  (`loginGuards`). Message identique pour pseudo inconnu et mauvais mot de passe.
- **Pseudo** : choisi par l'admin dans la fiche du membre (Réglages, Profils, section
  « Accès », `access.setUsername`) ; le membre le voit sans pouvoir le changer.
- **Lien d'activation ou de mot de passe oublié** : l'admin le crée dans la même section
  (`access.resetLink`) et l'envoie par message. Lien unique `#/activer/<jeton>` (14 jours,
  `invites`) pour choisir son mot de passe ; il remplace l'ancien lien et déconnecte les
  autres appareils du membre. Pas pour soi-même : un autre admin le fait.
- **Compte en libre-service** (`convex/account.ts`, Réglages, Mon compte) : e-mail facultatif
  par membre, confirmé par un lien de 24 heures (`#/email/<jeton>`) et jamais montré aux autres
  membres ; « Mot de passe oublié » à la connexion (`#/mot-de-passe`) : lien `#/activer/<jeton>`
  de 2 heures par e-mail, même réponse que l'adresse soit connue ou non, 3 par heure et par
  adresse, sans déconnecter personne avant usage ; changement de mot de passe et nouvel e-mail
  avec le mot de passe actuel ; déconnexion des autres appareils.
- **Données de la famille** (`convex/familyData.ts`, admins) : export JSON sans secrets ;
  suppression avec le nom de la famille et le mot de passe, abonnements Stripe arrêtés d'abord
  (`stripeNode.deleteFamily`), puis purge par lots. La famille du super-admin ne se supprime pas.
- Famille suspendue (`families.suspended`) : plus de connexion ni de session valide.
- **Onglet « Famille » de `/gestion`** (admins de la famille) : nom et lien, tableau des
  comptes (pseudo, rôle, accès ; la fiche d'un profil change le pseudo, le rôle admin ou
  membre via `access.setRole`, et crée le lien d'accès), apparence. Personne ne change son
  propre rôle ; le rôle du super-admin ne se change pas depuis une famille. Règle de
  confiance : tous les admins d'une famille ont les mêmes pouvoirs (l'un peut retirer le rôle
  d'un autre ou lui envoyer un lien de mot de passe) ; ne nommer admin que des adultes de
  confiance. Réparation d'un rôle dans une autre famille : console Convex, pour l'instant.
- **Apparence** : 3 thèmes (Carotte, Sauge, Myrtille) et 4 polices (Nunito, Quicksand,
  Lexend, Atkinson Hyperlegible Next), choisis par un admin (`settings.theme`, `settings.font`)
  et appliqués en direct sur tous les téléphones de la famille (`access.check` renvoie
  `look`). Les thèmes ne changent que les variables de couleur (`src/index.css`, attribut
  `data-theme`) ; les polices sont servies par l'app (Fontsource) et seule celle choisie est
  téléchargée (`src/lib/look.ts`). Couleurs du kit d'identité v1 ; contraste au-dessus de 4,5:1
  dans les trois thèmes (boutons Carotte en #C1511C, l'orange vif #E97537 reste pour le
  logo). Captures : `docs/themes/`.
- **Langue** (demande de PA, 2026-10-28) : le français pour tout le monde ; un admin coche
  « Deutsch » sur un profil de sa famille (fiche du profil, colonne « Langue » dans Gestion,
  Famille), chacun peut aussi la cocher pour lui-même (`access.setLang`, `members.lang`,
  rien de stocké pour le français). `access.check` renvoie `lang` ; la page passe en `de-CH`.
  Textes dans `src/i18n/fr.ts` (référence) et `src/i18n/de.ts`, que TypeScript oblige à être
  complet ; allemand de Suisse (« ss », jamais « ß »), vérifié par un test. Dates :
  `formatDayLong`, `formatDayShort`, `formatDateRange`, `formatQty` (point décimal et unités
  allemandes : Stück, EL, TL, Dose…) prennent la langue. Lot 2 (fait) : tous les écrans de
  l'app, Gestion et le guide, un fichier de textes par zone (`src/i18n/zones/`), les 16
  styles de recettes fixes (`tagText`). Lot 3 (fait) : la liste de courses et « À utiliser »
  calculent quantités, « Diverses » et « Bei Coop kaufen » dans la langue du profil
  (`buildShoppingList({ lang })`) ; le serveur écrit ses messages d'erreur en français et
  l'app les traduit à l'affichage (`src/i18n/serverText.ts`, appelé par `errorMessage`), un
  test vérifie que chaque phrase du serveur y a son allemand. Lot 4 (fait) : produits, rayons
  et articles habituels ont un nom allemand facultatif (`nameDe`), montré aux profils en
  allemand (`localName` côté serveur, `localize` dans `useBase`, l'édition garde le nom
  français via `frenchName`) ; la recherche trouve les deux noms. Le catalogue de départ a
  ses noms allemands (`convex/seedNamesDe.ts`) ; le reste est traduit par Claude en arrière-plan
  quand la famille a un profil en allemand (coche « Deutsch », puis chaque création), une
  seule traduction à la fois, regroupée après 30 secondes, et les noms que Claude laisse ne
  sont plus renvoyés automatiquement (`families.germanNames`). Bouton « Traduire maintenant »
  dans Gestion, Famille. La dictée suit la langue du profil, la recette reste rédigée en
  français. Lot 5 (fait) : la page d'accueil et les écrans de connexion ont un sélecteur
  FR | DE ; avant connexion, la langue est celle de l'appareil (`src/lib/deviceLang.ts` :
  choix mémorisé, sinon la langue du navigateur, sinon le français), et une fois connecté le
  profil impose la sienne, mémorisée pour le prochain écran de connexion. Textes de la page
  d'accueil dans `src/landing/i18n/` (séparés de l'app, `useL`), démo calculée en allemand ;
  captures d'écran et aperçu de partage restent en français. Restent en français : les
  recettes et l'onglet Super admin.
- **Guide pour les nouveaux** (depuis le 2026-10-28) : carte de bienvenue, tour en bulles
  (driver.js) et checklist « Premiers pas » dans Plus, pour les comptes activés après sa mise
  en route. Interrupteur des admins dans Gestion, Famille (`settings.onboarding`, activé pour
  les nouvelles familles ; l'activer marque les comptes existants comme habitués,
  `members.onboardingDoneAt = 0`). « Revoir le guide » dans Plus. Détail et captures :
  `docs/guide/GUIDE.md`, section 6. Un nouvel admin répond d'abord à trois questions (jour
  des courses, magasin, personnes) et a ses propres « Premiers pas » pour mettre la famille
  en route (lot S3d).
- **Logo** (kit d'identité v1, « m » souriant avec fourchette) : `src/components/Logo.tsx`
  en `currentColor`, il prend la couleur du thème (connexion, gestion). L'icône d'onglet,
  l'icône d'écran d'accueil et le manifeste suivent aussi le thème (`public/brand/`,
  `manifest-<thème>.webmanifest`, posés par `src/lib/look.ts`) ; une icône déjà installée
  garde sa couleur : il faut la réinstaller après un changement de thème. Carotte tant que
  le téléphone ne connaît pas la famille.
- **Espace super-admin** (PA, `members.superadmin`, posé seulement en base) : onglet
  « Super admin » de `/gestion` (`#/gestion/super-admin`) (`convex/superadmin.ts`). Liste de toutes les familles avec des
  chiffres seulement (comptes activés, recettes, dernière connexion, statut), jamais leur
  contenu. Créer une famille (catalogue de départ copié, admin avec son pseudo et son lien
  d'activation), nouveau lien pour l'admin d'une autre famille, suspendre ou réactiver une
  autre famille (appareils déconnectés et liens annulés, données gardées). Chaque fonction vérifie le super-admin côté serveur ; ce
  sont les seules fonctions qui lisent plusieurs familles.
- **Budget IA par famille** (lot C, 2026-10-28) : chaque appel à Claude (tickets, import,
  traduction du catalogue) et chaque dictée passe par `convex/aiBudget.ts` : une même
  mutation vérifie le plafond du mois (heure suisse, repart le 1er) et réserve l'appel (0,10 USD
  estimés, ou la dictée), si bien que des appels en rafale ne passent pas tous ; le coût réel
  tiré de `usage` (tarif Opus 5.5 dans `convex/domain/aiBudget.ts`) remplace l'estimation
  après la réponse ; table `aiUsage`. Catalogue limité à 1500 produits par prompt. Plafonds :
  2 USD de Claude et 60 dictées par mois, réglables par famille dans Super admin
  (`superadmin.setAiCaps`, champ vide : défaut). La famille du super-admin est comptée, jamais
  bloquée. Le dernier appel accepté peut dépasser le plafond de son coût réel. Compteurs visibles par le super-admin seulement (colonne « IA ce mois »).
- En ligne de commande, même création :
  `npx convex run families:create '{"name":"Dupont","admin":"Marc"}'`.
- Urgences : `access:revokeAll` (déconnecte tout le monde), `access:resetGuards`.
  Sessions et invitations expirées purgées chaque nuit (`crons.ts`).
- Police Nunito hébergée dans l'app (pas d'appel à Google). CSP stricte dans le build de production.

## Concepts

- **Semaine de planning** : 7 jours commençant le jour des courses (`settings.shoppingDay`,
  défaut samedi = 6). La liste de courses d'une semaine couvre ses 7 jours.
- **Repas** (`meals`) : date + midi/soir + recette (ou texte libre) + personnes + `cookedOn`.
  « Ce soir 3 pers. + demain midi 2 pers. » = deux repas, même recette, même `cookedOn`.
  Repas issu de restes (`fromLeftoverOf`) : jamais sur la liste de courses.
- **Restes / frigo** : un repas « pas mangé » ou avec `leftoverPortions > 0` apparaît dans
  « Frigo » avec date limite = `cookedOn + recipe.fridgeDays`. États : bon, à manger
  aujourd'hui, périmé.
- **Pas cuisiné** (statut `pas cuisiné`, différent de « pas mangé » qui veut dire cuisiné
  mais pas mangé) : le plat reste visible, barré, et sort de la liste de courses (ce qui
  n'était pas acheté disparaît). À l'annulation (`meals.markNotCooked`), les ingrédients
  déjà cochés sur la liste de sa semaine sont proposés comme « déjà à la maison » ; ceux
  gardés vont dans `homeStock` et s'affichent dans le Frigo, « À utiliser », avec des idées
  de recettes qui les utilisent et « Utilisé ou jeté ». Pas de date de péremption : l'app
  dit seulement depuis quand, la famille juge. Sur la liste de courses, un ingrédient à la
  maison est signalé (« Peut-être à la maison… ») mais jamais retiré. Les restes planifiés
  depuis ce plat sont retirés. « Prévu » le remet au menu et reprend ses ingrédients.
  Pour cuisiner le plat un autre jour : « Déplacer ». Une cuisson vaut pour tous ses repas
  (retour de PA, 2026-10-28) : le souper et le midi du lendemain cuisiné avec lui sont
  annulés ensemble, avec un seul stock « À utiliser » pour toutes leurs portions, et
  remis ensemble avec « Prévu ». Refusé sur le midi si le souper a déjà été mangé
  (c'est alors « Pas mangé »).
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
  - Nombre de personnes habituel par recette (`recipes.defaultPersons`), proposé en
    planifiant et sur la fiche (1 pour un petit-déjeuner individuel), sinon le réglage du foyer.
  - Unité « tranche ». Ingrédient acheté par paquet (`ingredients.packSize`, facultatif) :
    la liste compte des paquets entiers (« 2 paquets », « ≈ 14 tranches » dessous) et le
    coût estimé est celui des paquets entiers.
  - Enseignes : un ingrédient ou un article habituel peut être « disponible seulement chez »
    certaines enseignes (`onlyChains`). Dans un autre magasin, il va dans une section
    « À acheter chez … » en bas, hors compteur du magasin mais compté dans le coût.
  - Quantité à l'ajout (champ « Qté »), « − n + » sur les articles habituels ajoutés.
    Fiche d'article habituel : nom, rayon, prix d'un article, enseignes, quantité habituelle.
  - Portions au lieu de personnes. « En plus pour le frigo » (`meals.extraPortions`) :
    achetées avec le plat, au frigo dès le jour de cuisson, réutilisables dans la semaine.
  - « Planifier les restes » directement depuis un plat (portions en plus ou restes),
    même avant la cuisson, jamais avant le jour de cuisson.
  - Photo de profil (`members.imageId`, 400 px), affichée à la place de l'emoji partout.
  - Connexion : jeton et profil gardés 365 jours sur l'appareil, stockage durable demandé
    au navigateur. Les onglets Safari effacent les données après 7 jours sans visite :
    conseil affiché d'ajouter l'app à l'écran d'accueil (non concernée).
  - Plat récurrent : option « Répéter » à l'ajout (jours de la semaine + 1 à 12 semaines,
    `meals.addRecurring`), sans doublon si le plat est déjà à ce créneau ce jour-là.
  - « Restes à finir » en tête du choix du plat (`meals.leftoversFor`) : portions en plus
    ou restes cuisinés au plus tard ce jour-là et encore bons à cette date. Choisis, ils
    sont pris du frigo (`planLeftover`), sans courses. Les portions déjà placées sont
    déduites quand on modifie les portions en plus ou le statut d'un plat.
  - Photo du produit exact (`staples.imageId`, `ingredients.imageId`, 800 px) dans les fiches
    d'article habituel et d'ingrédient ; vignette sur la liste de courses, agrandie au tap.
    La suppression d'un article libre passe par « ⋯ » (« Retirer de la liste »).
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
- `sort.ts` : tri des tableaux de la gestion (ordre français, cases vides en dernier).
- `openFoodFacts.ts` : lecture d'un produit Open Food Facts, nom court générique, rayon
  suggéré, doublons (code-barres puis nom), allergènes et nutrition d'une portion.
- `receipts.ts` : lecture validée de la réponse de Claude, contrôle du total, prix d'un
  ingrédient depuis une ligne (kilo ou paquet), contenu de paquet plausible.
- `recipeImport.ts` : contrôle du lien, lecture de la fiche recette d'une page,
  réponse de Claude validée, brouillon (catalogue d'abord, quantités par portion,
  conversion des unités, doublons fusionnés).
- `products.ts` : liste unifiée ingrédients + articles hors recette, filtres, motif de
  refus de suppression.
- `onboarding.ts` : étapes de « Premiers pas » d'après les actions du membre (ou de la
  famille, pour un admin), carte de
  bienvenue, habitués à marquer quand le guide est activé.

## Règles

- Français irréprochable, typographie suisse romande (« », espace insécable avant `: ; ! ?`).
- Jamais de tiret cadratin ni demi-cadratin dans l'UI.
- Commentaires de code en anglais, textes d'interface en français.
- Mobile d'abord : cibles 44 px min, police 16 px min, une main.
- Sauvegarde à chaque action, pas de bouton « Enregistrer » sauf formulaires de recette.
- Secrets : `ANTHROPIC_API_KEY` et `GROQ_API_KEY` dans Convex, `CONVEX_DEPLOY_KEY` dans GitHub. `.env.local` jamais committé.
