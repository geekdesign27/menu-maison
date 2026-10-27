# Développement et mise en ligne

## Lancer en local

Serveurs gérés par Portly (projet `menu-maison`) :

- `menu-maison/convex` : `npx convex dev` en mode local anonyme (`CONVEX_AGENT_MODE=anonymous`), aucun compte requis.
- `menu-maison/web` : Vite sur http://localhost:5190

Code famille du backend local de test : `test-famille`
(`CONVEX_AGENT_MODE=anonymous npx convex env set FAMILY_CODE test-famille`).
Le code de production est différent et n'est jamais écrit dans le dépôt.

Lecture des tickets et import de recettes : clé Anthropic `ANTHROPIC_API_KEY` dans l'environnement Convex, jamais
dans le dépôt. Copier la clé puis, sans la taper :
`pbpaste | CONVEX_AGENT_MODE=anonymous npx convex env set ANTHROPIC_API_KEY` (local) et
`pbpaste | npx convex env set ANTHROPIC_API_KEY --deployment pierre-alain-schutz:menu-maison:production`.

Dictée des recettes : clé Groq `GROQ_API_KEY` (console.groq.com, offre gratuite, sans carte),
même méthode : `pbpaste | CONVEX_AGENT_MODE=anonymous npx convex env set GROQ_API_KEY` (local) et
`pbpaste | npx convex env set GROQ_API_KEY --deployment pierre-alain-schutz:menu-maison:production`.
En place depuis le 2026-10-24.
Sans clé, l'écran de scan l'indique clairement. Les tokens de chaque lecture sont journalisés.

Au premier code famille correct, le backend se remplit tout seul (profils, rayons,
ingrédients avec prix estimés, recettes, 5 magasins autour de Fribourg). Sur un
déploiement vide, `npx convex run seed:run` fait la même chose.

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
- Code famille : `npx convex env set FAMILY_CODE --deployment pierre-alain-schutz:menu-maison:production`
  (sans valeur, la CLI la demande sans l'écrire dans l'historique). Changer le code
  déconnecte tous les téléphones.

## Mise en ligne (GitHub Pages + Convex Cloud, comme evacecole)

À faire une seule fois :

1. **Convex** : `npx convex login`, puis `npx convex deploy` crée le déploiement de
   production (plan gratuit). Dans le Dashboard Convex du projet, Settings,
   Environment Variables : ajouter `FAMILY_CODE` (un code long que toute la famille connaît).
   Toujours dans Settings : générer une **Production Deploy Key**.
2. **GitHub** : créer le dépôt `menu-maison` (compte `geekdesign27`), ajouter le secret
   `CONVEX_DEPLOY_KEY` (Settings, Secrets and variables, Actions), activer Pages avec la
   source « GitHub Actions », puis pousser `main`.
3. L'app est publiée sur https://menumaison.ch .
   Sur chaque téléphone : ouvrir le lien, entrer le code famille, choisir son profil, puis
   « Ajouter à l'écran d'accueil ».

Chaque push sur `main` relance les tests, déploie les fonctions Convex et publie le front.
