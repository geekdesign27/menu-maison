# CLAUDE.md : Menu Maison

Spécification qui fait foi : [docs/SPEC.md](docs/SPEC.md). Dev et déploiement : [docs/DEV.md](docs/DEV.md).

App familiale (Pierre-Alain, Patricia, Clara) : menus de la semaine et courses du samedi
matin, magasins suisses avec ordre des rayons par magasin.

## Stack (imposée)

Vite + React 19 + TypeScript + Tailwind 4, HashRouter, Convex (gratuit), Vitest,
GitHub Pages via GitHub Actions. Même modèle que `~/dev/evacecole`.

## Règles

- Logique métier pure dans `convex/domain/` avec tests Vitest. L'UI et les fonctions
  Convex l'importent, elles ne la dupliquent pas.
- Toutes les fonctions Convex publiques prennent `token` et appellent `assertSession`.
- Français irréprochable, typographie suisse romande, jamais de tiret cadratin ni demi-cadratin.
- Commentaires de code en anglais, interface en français.
- Mobile d'abord : cibles 44 px, police 16 px min.
- `npm test`, `npm run typecheck` et `npm run build` verts avant chaque commit.
- Serveurs de dev via Portly uniquement.
