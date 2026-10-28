# Développement et mise en ligne

## Lancer en local

Serveurs gérés par Portly (projet `menu-maison`) :

- `menu-maison/convex` : `npx convex dev` en mode local anonyme (`CONVEX_AGENT_MODE=anonymous`), aucun compte requis.
- `menu-maison/web` : Vite sur http://localhost:5190

Backend local : une famille de test se crée avec
`CONVEX_AGENT_MODE=anonymous npx convex run families:create '{"name":"Test","admin":"Test"}'`,
puis on ouvre `http://localhost:5190/#/activer/<invite>` pour choisir son mot de passe (le
pseudo est renvoyé par la commande).

Lecture des tickets et import de recettes : clé Anthropic `ANTHROPIC_API_KEY` dans l'environnement Convex, jamais
dans le dépôt. Copier la clé puis, sans la taper :
`pbpaste | CONVEX_AGENT_MODE=anonymous npx convex env set ANTHROPIC_API_KEY` (local) et
`pbpaste | npx convex env set ANTHROPIC_API_KEY --deployment pierre-alain-schutz:menu-maison:production`.

Dictée des recettes : clé Groq `GROQ_API_KEY` (console.groq.com, offre gratuite, sans carte),
même méthode : `pbpaste | CONVEX_AGENT_MODE=anonymous npx convex env set GROQ_API_KEY` (local) et
`pbpaste | npx convex env set GROQ_API_KEY --deployment pierre-alain-schutz:menu-maison:production`.
En place depuis le 2026-10-24.
Sans clé, l'écran de scan l'indique clairement. Les tokens de chaque lecture sont journalisés.

Abonnement (Stripe, plan dans `docs/PLAN-abonnement.md`) : clés `STRIPE_SECRET_KEY` et
`STRIPE_WEBHOOK_SECRET`, plus `SITE_URL` (adresse de l'app, `https://menumaison.ch` par
défaut). En local, uniquement des clés de **test** (`sk_test_…`), même méthode :
`pbpaste | CONVEX_AGENT_MODE=anonymous npx convex env set STRIPE_SECRET_KEY`, puis
`CONVEX_AGENT_MODE=anonymous npx convex env set SITE_URL http://localhost:5190`.
Le produit « Menu Maison » et son prix de 20 CHF par an se créent seuls au premier paiement,
ou d'avance avec `npx convex run stripeNode:ensurePrice` (l'identifiant rendu peut aller dans
`STRIPE_PRICE_ID`). Le portail client a sa propre configuration (carte, factures, résiliation
en fin d'année, jamais de changement d'offre) : `npx convex run stripeNode:ensurePortalConfig`,
identifiant dans `STRIPE_PORTAL_CONFIG_ID`. Webhook en local : Stripe CLI
`stripe listen --forward-to http://127.0.0.1:3211/stripe/webhook` (3211 : port par défaut
du site Convex local, à vérifier dans `.env.local`, `CONVEX_SITE_URL` ; le secret `whsec_…`
affiché va dans `STRIPE_WEBHOOK_SECRET`). En production, l'adresse du webhook est
`https://<déploiement>.convex.site/stripe/webhook`, événements `checkout.session.completed`
et `customer.subscription.*`. Sans clé, l'inscription répond « Le paiement n'est pas encore
configuré. » : rien n'est créé.

E-mails (Resend, `convex/email.ts`, modèles dans `convex/domain/emails.ts`) : clé
`RESEND_API_KEY`, expéditeur `EMAIL_FROM` (par défaut `Menu Maison <bonjour@menumaison.ch>`,
domaine menumaison.ch à vérifier dans Resend avec ses enregistrements DNS chez Infomaniak),
alertes à PA vers `ADMIN_ALERT_EMAIL`. Sans clé, rien ne part (journal `emailLog` en
« skipped »). Aperçu de chaque e-mail, en français et en allemand : Super admin, section E-mails.

Chaque nouvelle famille reçoit le catalogue de départ (`seedFamily`) : rayons, ingrédients
avec prix estimés, recettes à découvrir, 5 magasins autour de Fribourg, articles habituels.

## Page de présentation

`menumaison.ch/` montre la page de présentation aux visiteurs, et la Semaine aux téléphones
déjà connectés. Le code est dans `src/landing/`, chargé à part de l'app (pas de Convex).

- `#/connexion` : écran de connexion (bouton « Se connecter »).
- `#/decouvrir` : la page de présentation, même connecté.
- `#/sans-invitation` : la page avec le message « pas encore dans le carnet d'invitations »
  (lien « Je n'ai pas de compte » de l'écran de connexion).
- Les liens `#/f/<famille>` et `#/activer/<lien>` ouvrent l'app comme avant.

Les démos (magasins, portions, coût des lasagnes) tournent sur `buildShoppingList` et le
catalogue de départ (`convex/seedData.ts`) ; `src/landing/demo.test.ts` vérifie les chiffres
cités. Les captures viennent de `docs/guide/captures` (famille fictive Martin), converties en
WebP dans `public/landing/`.

Bouton « En parler avec P-A » : variable GitHub (Settings, Secrets and variables, Actions,
onglet Variables) `VITE_CONTACT_URL`, au format `mailto:…`, `tel:…` ou `https://…`. Sans elle,
le bouton est masqué et la page invite à passer par la personne qui a fait découvrir l'app.

## Tests

- `npm test` : Vitest (logique métier `convex/domain`, intégrité des données de départ).
- `npm run typecheck` : TypeScript front et Convex.
- `npm run build` : build de production.

## En production

- App : https://menumaison.ch (domaine Infomaniak, DNS vers GitHub Pages ; l'ancienne adresse
  geekdesign27.github.io/menu-maison redirige). Dépôt public `geekdesign27/menu-maison`.
- Convex : projet `menu-maison` (équipe `pierre-alain-schutz`), déploiement de production
  `resolute-squid-776`, région Europe (Irlande). Mis en place le 2026-10-24.
- Clé de déploiement : secret GitHub `CONVEX_DEPLOY_KEY` (clé « github-actions »).
- **Attention : sur ce Mac, `--prod` vise le déploiement local**, pas la production. Toujours
  nommer la production : `--deployment resolute-squid-776`. Vérifier au besoin quel
  backend le site appelle (`resolute-squid-776.eu-west-1.convex.cloud`).
- Sauvegarde avant toute opération sur les données :
  `npx convex export --deployment resolute-squid-776 --include-file-storage --path backups/<nom>.zip`
  (`backups/` est ignoré par git).
- Comptes : voir « Accès » dans SPEC.md. Nouvelle famille en production :
  `npx convex run families:create '{"name":"…","admin":"…"}' --deployment resolute-squid-776`,
  puis envoyer à l'admin le lien `https://menumaison.ch/#/activer/<invite>`.

## Mise en ligne (GitHub Pages + Convex Cloud, comme evacecole)

À faire une seule fois :

1. **Convex** : `npx convex login`, puis `npx convex deploy` crée le déploiement de
   production (plan gratuit). Dans le Dashboard Convex du projet, Settings,
   Environment Variables : ajouter les clés `ANTHROPIC_API_KEY` et `GROQ_API_KEY`.
   Toujours dans Settings : générer une **Production Deploy Key**.
2. **GitHub** : créer le dépôt `menu-maison` (compte `geekdesign27`), ajouter le secret
   `CONVEX_DEPLOY_KEY` (Settings, Secrets and variables, Actions), activer Pages avec la
   source « GitHub Actions », puis pousser `main`.
3. L'app est publiée sur https://menumaison.ch .
   Sur chaque téléphone : ouvrir le lien d'invitation ou de la famille, se connecter, puis
   « Ajouter à l'écran d'accueil ».

Chaque push sur `main` relance les tests, déploie les fonctions Convex et publie le front.
