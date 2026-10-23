# Menu Maison

App familiale (Pierre-Alain, Patricia, Clara) pour les menus de la semaine et les courses
du samedi matin. Mobile d'abord, installable sur l'écran d'accueil.

## Ce que fait l'app

- **Semaine** : planning du samedi au vendredi (jour des courses réglable), midi et soir.
  Un plat du soir peut aussi servir le lendemain midi : les quantités s'additionnent.
  Alerte si un plat a été mangé ou est prévu dans les 7 jours.
- **Courses** : liste calculée depuis la semaine, ingrédients fusionnés (2 plats au poulet,
  une seule ligne), triée dans l'ordre des rayons du magasin choisi. Coches partagées en
  temps réel, filtre « Reste à acheter », articles libres, coût estimé en CHF.
- **Magasins** : Aldi, Lidl, Coop, Migros, Denner, plusieurs succursales. Ordre des rayons
  par magasin et exceptions par article (« ici, la salade est au frais »).
- **Recettes** : 56 recettes de départ (dont 19 classiques suisses), cœurs par personne,
  « Nos recettes », création et modification.
- **Frigo** : plats pas mangés et restes, avec la date limite de conservation.
- **Envies**, **Menus types** (semaines habituelles en un tap), **Statistiques**.

Les prix sont des estimations moyennes modifiables (Réglages). Aucune API gratuite et fiable
ne donne les prix Coop ou Migros.

## Démarrer

Voir [docs/DEV.md](docs/DEV.md) pour le local et la mise en ligne, et
[docs/SPEC.md](docs/SPEC.md) pour la spécification.

```bash
npm install
npm test
npm run build
```
