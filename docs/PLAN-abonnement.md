# Plan : Menu Maison payant (abonnement Stripe)

Rédigé le 2026-10-28. Statut : **décisions prises, en attente du feu vert pour coder**.

## Décisions de PA (2026-10-28)

- Essai de **7 jours** (au lieu de 2).
- Familles existantes **offertes**. Dans Super admin, un bouton **Offrir / Retirer l'offre**
  sur chaque famille, pour offrir l'app à des proches ou à la famille.
- E-mails envoyés avec **Resend**, depuis menumaison.ch.
- Vendeur : **Pierre-Alain Schütz, en son nom propre** (adresse à fournir par PA pour les
  mentions légales).

## L'offre

- **20 CHF par an** et par famille, prélevés automatiquement chaque année par Stripe.
- **7 jours gratuits** pour essayer, carte demandée à l'inscription (débit à la fin de l'essai).
- Inclus : toute l'app, tous les profils de la famille, l'IA dans le budget mensuel (lot C).
- Résiliation en un clic, à tout moment, effective à la fin de l'année payée.
- Familles existantes (la tienne, tes potes) : statut **offert**, jamais facturées, sauf
  si elles choisissent de payer.
- À côté : **formation et accompagnement IA** par P-A (créer son app avec l'IA, usage
  avancé de l'IA), sur contact, hors abonnement.

## Ce que dit Stripe (vérifié le 2026-10-28)

- Abonnement annuel en CHF avec essai : `subscription_data.trial_period_days`, carte
  collectée par Checkout. Pas de minimum documenté pour la durée d'essai.
- **TWINT est possible pour l'abonnement** : Stripe a un guide officiel « Set up a
  subscription with TWINT » (le client autorise une fois les prélèvements dans Checkout).
  À activer dans les moyens de paiement de Stripe, à côté de la carte (Apple Pay et
  Google Pay compris).
- **Compte Stripe partagé avec AuditApp** (constaté le 2026-10-28) : le logo, les couleurs
  et le nom du compte s'appliquent à tout le compte. Menu Maison peut avoir son propre
  libellé sur le relevé de carte (`statement_descriptor` du produit) ; pour une marque
  complètement séparée, il faudrait un second compte Stripe.
- **Le connecteur Stripe** n'a accès qu'au mode réel : le développement se fait avec un
  bac à sable (sandbox) Stripe à ajouter au connecteur, rien n'est créé en réel avant S7.
- Le portail client Stripe gère carte, factures et résiliation : rien à coder pour ça.
- Webhook dans Convex : une route `convex/http.ts` reçoit l'événement, une action
  `"use node"` vérifie la signature avec le SDK Stripe, des mutations internes écrivent.

## Parcours d'un nouveau client

1. Page d'accueil, section **Tarif** : « Essayer 7 jours gratuits ».
2. Petit formulaire : nom de la famille, ton prénom, langue (FR | DE).
3. **Stripe Checkout** : e-mail, carte, acceptation des conditions.
4. Retour sur `#/bienvenue` : l'app vérifie la session auprès de Stripe, crée la famille
   (catalogue de départ, toi en admin) et ouvre l'écran « Choisis ton mot de passe ».
5. **E-mail de bienvenue** avec le lien de connexion de la famille et le lien d'activation
   (si l'onglet a été fermé).
6. L'app, puis le guide de bienvenue et la fenêtre « Ajouter à l'écran d'accueil ».

La famille n'est créée qu'une fois Stripe confirmé : un Checkout abandonné ne crée rien.
Le webhook crée aussi la famille si le retour sur `#/bienvenue` n'a jamais lieu, sans
doublon (clé : l'identifiant de la session Stripe).

## Parcours d'une famille existante qui passe payante

Gestion, nouvel onglet **Abonnement** (admins) : statut, prochaine échéance, « Gérer mon
abonnement » (portail Stripe). Une famille offerte voit « Offert par P-A » et peut, si elle
le souhaite, saisir un e-mail et s'abonner (Checkout relié à sa famille existante).

## Ce que voit une famille selon son statut

| Statut Stripe | Accès |
|---|---|
| Essai, actif, offert | Normal |
| Paiement échoué | Normal 7 jours, bandeau « Mets à jour ta carte » |
| Résilié, impayé, essai non converti | Écran « Abonnement terminé » : lecture seule, bouton « Réactiver » |
| 90 jours après la fin | Données supprimées (à confirmer avec toi), e-mail d'avertissement 14 jours avant |

Contrôle côté serveur, dans `requireMember` : une famille sans accès peut lire, pas écrire.

## E-mails (Resend, HTML aux couleurs de Menu Maison)

Chaque e-mail : logo, couleurs Carotte, police lisible, un seul bouton d'action, version
texte brut en secours, en français ou en allemand selon la langue du destinataire,
lisible en mode sombre, expéditeur `Menu Maison <bonjour@menumaison.ch>`. Les modèles
vivent dans le code (`convex/emails/`) avec un test qui vérifie chaque modèle dans les
deux langues et un aperçu visuel dans Super admin avant tout envoi réel.

**Aux clients**

| E-mail | Quand |
|---|---|
| Bienvenue | Essai démarré : lien de connexion de la famille, lien d'activation, fin de l'essai |
| Rappel de fin d'essai | 2 jours avant le premier débit : montant, date, comment résilier |
| Abonnement confirmé | Premier débit réussi (en plus du reçu Stripe) |
| Paiement échoué | Débit refusé : lien pour mettre la carte à jour, 7 jours pour régler |
| Abonnement résilié | Résiliation enregistrée : date de fin d'accès, comment réactiver |
| Avant suppression | 14 jours avant la suppression des données d'une famille terminée |
| Mot de passe oublié | Lien pour en choisir un nouveau (valable 1 heure, usage unique) |
| Mot de passe changé | Alerte de sécurité : « Ce n'était pas toi ? » |
| E-mail modifié | Envoyé à l'ancienne et à la nouvelle adresse |
| Famille supprimée | Confirmation de suppression à la demande du client |

Les reçus et factures restent ceux de Stripe (activés dans Stripe).

**À PA** (adresse d'alerte réglable dans Super admin)

| E-mail | Contenu |
|---|---|
| Nouvelle inscription | Famille, prénom, e-mail, langue, date de fin d'essai, source de la visite |
| Essai converti | Famille, montant, date du prochain renouvellement, total des abonnés |
| Résiliation | Famille, durée d'abonnement, raison donnée dans le portail Stripe |
| Paiement échoué | Famille, e-mail, montant |
| Bilan de la semaine | Visites, clics, essais, conversions, revenus, coût IA, chaque lundi |

## Statistiques de la page et conversion

Mesurées dans Convex, sans outil tiers, **sans cookie et sans donnée personnelle** : donc
pas de bandeau de consentement. Un compteur par jour, par page et par bouton, avec la
langue, la provenance (site d'origine, paramètres `utm_` d'une campagne) et le type
d'appareil (téléphone ou ordinateur). Les robots connus sont ignorés, les envois sont
limités pour éviter le remplissage.

- **Fréquentation** : visites de la page d'accueil, sections vues, par jour et par source.
- **Clics** : chaque bouton nommé (« Essayer 7 jours », « Se connecter », « En parler avec
  P-A », sélecteur FR | DE…).
- **Entonnoir** : visites, clic « Essayer », formulaire rempli, paiement Stripe ouvert, essai
  démarré, abonnement payé, avec le taux à chaque étape.
- Écran **Statistiques** dans Super admin, sur 7, 30 ou 365 jours.

## Actions importantes en libre-service

| Action | Qui | Où |
|---|---|---|
| Mot de passe oublié | Tout membre qui a un e-mail | Écran de connexion, par e-mail |
| Nouveau lien pour un membre sans e-mail | Admin de la famille | Réglages, Profils (existe) |
| Ajouter ou changer son e-mail | Chaque membre | Réglages, son profil (confirmation par e-mail) |
| Changer son mot de passe | Chaque membre | Réglages, son profil |
| Changer l'e-mail de facturation | Admin | Gestion, Abonnement |
| Carte, factures, résiliation, réactivation | Admin | Gestion, Abonnement, portail Stripe |
| Exporter les données de la famille | Admin | Gestion, Abonnement (fichier JSON, droit d'accès nLPD) |
| Supprimer la famille et ses données | Admin | Gestion, Abonnement, confirmation en deux étapes |
| Déconnecter tous les appareils | Chaque membre | Réglages, son profil |

Un e-mail par membre devient facultatif : sans e-mail, c'est l'admin qui envoie un nouveau
lien, comme aujourd'hui.

## Guide de bienvenue d'une famille cliente

Le guide existant (carte de bienvenue, tour en bulles, « Premiers pas ») est gardé et
complété pour une famille qui arrive seule, sans P-A pour l'aider :

- **Premier lancement de l'admin** : trois questions courtes avant l'app (jour des courses,
  magasin habituel, nombre de personnes), puis le tour.
- **Bandeau d'essai** discret : « Essai gratuit, encore 5 jours. Ensuite 20 CHF par an. »
  avec un lien vers Abonnement.
- **Premiers pas de l'admin** : ajouter les membres de la famille et leur envoyer leur lien,
  ajouter l'app à l'écran d'accueil (lot 0), planifier une première semaine, faire une
  première liste de courses.
- **Premiers pas d'un membre** : inchangés, plus l'écran d'accueil et son e-mail.
- **Textes** revus pour un client qui ne connaît pas P-A, en français et en allemand.
- Vérifié de bout en bout sur téléphone, dans les deux langues, avec un compte de test.

## Avant la mise en ligne : ce qui n'a pas encore été vérifié

Liste tenue depuis le 2026-10-28, à cocher avant d'ouvrir l'inscription au public.

**Paiement (Stripe)**
- [ ] Webhook de bout en bout en mode test (Stripe CLI, `STRIPE_WEBHOOK_SECRET`) :
  renouvellement, résiliation dans le portail, paiement échoué (carte de test 4000 0000 0000 0341),
  fin d'essai sans paiement.
- [ ] Bouton « Réactiver » avec un vrai abonnement terminé.
- [ ] Bandeaux « paiement échoué » et « lecture seule » vus à l'écran (seuls les tests les couvrent).
- [ ] TWINT activé dans Stripe et un abonnement de test payé avec.
- [ ] Nom affiché sur la page de paiement : « Entreprise 1 » à remplacer (réglages publics du
  compte, ou second compte Stripe).
- [ ] Production : clé live, `SITE_URL=https://menumaison.ch`, webhook live vers
  `https://resolute-squid-776.eu-west-1.convex.site/stripe/webhook`, `STRIPE_PRICE_ID` et
  `STRIPE_PORTAL_CONFIG_ID` live, puis un vrai paiement de 20 CHF remboursé.

**IA et coûts**
- [ ] Compteur IA en production : vérifier qu'un premier vrai ticket fait bouger « IA ce mois ».
- [ ] Limite de dépense mensuelle posée dans la console Anthropic.
- [ ] Chiffres réels de la page « Usage » de Convex après un mois, pour le calcul des frais.
- [ ] Limites gratuites de Groq confirmées dans la console Groq.
- [ ] Choix confirmé pour la famille de PA : sans plafond IA (la revue proposait un filet à 20 USD).

**Traduction allemande**
- [ ] Relecture par une personne de langue maternelle allemande (app, page d'accueil, e-mails),
  en particulier « Kühli », « Batzen », « Tour de Suisse », « Jeden. Einzelnen. Tag. ».
- [ ] Dictée en allemand avec une vraie voix.
- [ ] Page d'accueil en allemand vue sur ordinateur, écran d'invitation en allemand.
- [ ] Traduction automatique du catalogue en production (première coche « Deutsch »).

**Téléphones réels**
- [ ] Fenêtre « Ajouter à l'écran d'accueil » sur un vrai iPhone (Safari) et un vrai Android
  (Chrome) : vue seulement sur un téléphone simulé.
- [ ] Parcours d'inscription complet sur un vrai téléphone, page Stripe comprise.

**Lots encore à faire** : e-mails (S3b), actions en libre-service (S3c), guide de bienvenue
client (S3d), page d'accueil (S4), pages légales (S5), statistiques (S6b), essai complet (S7).

**Ménage** : familles de test locales « Test Stripe » et « Rochat Test », et leurs abonnements
de test chez Stripe.

## Lots

| Lot | Contenu | Fichiers principaux |
|---|---|---|
| 0 | Fenêtre « Ajouter à l'écran d'accueil » au premier lancement sur téléphone | nouveau composant, `Layout`, i18n |
| S1 | **Fait le 2026-10-28** (sans UI, inactif tant que les clés manquent). Stripe côté serveur : produit et prix, Checkout, page de retour, webhook signé, statut sur la famille | `schema`, `http.ts`, `billing.ts`, `stripeNode.ts` |
| S2 | **Fait le 2026-10-28.** Accès selon le statut (offert à part : `families.offered`, les familles sans abonnement sont offertes), écritures et IA coupées en lecture seule, budget d'essai réduit, bandeau, bouton Offrir / Retirer l'offre dans Super admin | `lib.ts`, `domain/billing.ts`, tests |
| S3 | **Fait le 2026-10-28.** Parcours client : `#/essai`, `#/bienvenue` puis mot de passe, carte Abonnement (Réglages et Gestion), portail Stripe dédié, un seul abonnement par famille | `Gate`, `SignupScreens`, `SubscriptionPanel` |
| S3b | E-mails HTML de marque (clients et alertes à PA), aperçus dans Super admin | `convex/emails/` |
| S3c | Actions en libre-service : mot de passe oublié, e-mail, export, suppression, déconnexion | `access.ts`, `Settings`, `gestion/` |
| S3d | Guide de bienvenue d'une famille cliente | `onboarding/`, i18n |
| S4 | Page d'accueil : section Tarif, section Formation, boutons, traductions | `landing/` |
| S5 | Légal : conditions générales, confidentialité, mentions légales | `landing/`, réglages Stripe |
| S6 | Super admin : statut par famille, revenus de l'année, essais, échecs, bouton Offrir / Retirer l'offre | `superadmin.ts`, `FamiliesSection` |
| S6b | Statistiques : visites, clics, entonnoir de conversion, bilan de la semaine | `analytics.ts`, `landing/`, `gestion/` |
| S7 | Essai de bout en bout en mode test Stripe, puis passage en production | — |

Chaque lot : tests, typecheck, build, revue sécurité (paiement et comptes), vérification
dans l'app, déploiement. Ordre : 0, puis S1 à S7.

## Ce que l'app doit gagner (évaluation)

- **Données** : sur `families`, le client Stripe, l'abonnement, le statut, la fin de période,
  l'e-mail de facturation, « offert ». Table des inscriptions en cours (session Stripe vers
  famille, pour l'idempotence). Journal des événements Stripe déjà traités.
- **Serveur** : route webhook signée, création de famille depuis un paiement, contrôle
  d'accès par statut, sessions Checkout et portail, purge des familles expirées (cron).
- **E-mails** : aujourd'hui l'app n'en envoie aucun. Voir la section E-mails : Resend,
  gratuit jusqu'à 3000 e-mails par mois, expédié depuis menumaison.ch.
- **E-mail facultatif par membre** et mot de passe oublié en libre-service.
- **Statistiques** sans cookie, entonnoir de conversion et alertes à PA.
- **Budget IA pendant l'essai** : plafond réduit (0,30 USD) pour qu'un essai gratuit ne
  coûte presque rien.
- **Page d'accueil** : la section « club privé » devient Tarif et Formation ; « Accès privé »
  devient « Tarif » dans le menu ; « Je n'ai pas de compte » mène à l'offre ; la fenêtre
  « Pas encore dans le carnet d'invitations » disparaît ; « projet pour les amis des
  Schütz » est réécrit ; tout en allemand aussi.
- **Légal (Suisse)** : mentions légales avec identité et adresse (obligatoire pour la vente
  en ligne), conditions générales (prix, renouvellement, résiliation, remboursement),
  confidentialité selon la nLPD (Convex en UE, Anthropic, Groq et Stripe hors Suisse).
  Pas de TVA sous 100 000 CHF de chiffre d'affaires.

## Ce que PA fait lui-même

- Créer les clés Stripe (test puis production) et les poser dans Convex :
  `npx convex env set STRIPE_SECRET_KEY …`, `STRIPE_WEBHOOK_SECRET`. Claude n'y touche jamais.
- Dans Stripe : activer le portail client, les reçus par e-mail, l'adresse des conditions.
- Créer le compte Resend, ajouter ses enregistrements DNS chez Infomaniak (SPF, DKIM,
  DMARC) et poser la clé dans Convex (`RESEND_API_KEY`).
- Choisir l'adresse qui reçoit les alertes (nouvelles inscriptions, conversions).
- Fournir l'identité et l'adresse pour les mentions légales.
- Fixer une limite de dépense dans la console Anthropic.

## Risques et réalisme

- **Fin de l'essai** : l'app envoie son propre e-mail de rappel 2 jours avant le débit,
  sans dépendre des réglages de Stripe. Une contestation de paiement coûte des frais (de
  l'ordre de 15 CHF, à vérifier) : le rappel les évite.
- **Frais Stripe** sur 20 CHF : de l'ordre de 0,90 CHF par paiement (à vérifier dans ton
  tableau de bord), donc environ 19 CHF nets par famille.
- **Changement de nature** : tu vends un service. Support, disponibilité et données des
  clients deviennent ta responsabilité.
