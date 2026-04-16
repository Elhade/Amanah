# JamaaAmanah — Plateforme de gestion des dons

> *La confiance au cœur de vos dons*

[![Open in Bolt](https://bolt.new/static/open-in-bolt.svg)](https://bolt.new/~/sb1-mxml1ul4)

---

## Présentation

JamaaAmanah est une application web complète de collecte et gestion des dons caritatifs. Elle permet de suivre les donations par projet, par responsable (leader) et par méthode de paiement (carte bancaire via Stripe ou espèces), avec un tableau de bord d'administration complet et des espaces personnels pour chaque responsable.

---

## Fonctionnalités principales

- **Collecte en ligne** via Stripe (carte bancaire) avec confirmation par webhook
- **Enregistrement des dons en espèces** par les responsables
- **Gestion des projets** caritatifs avec objectifs de collecte et suivi de progression
- **Gestion des responsables** avec liens de don personnalisés (`/don?ref=slug`)
- **Tableau de bord global** : total collecté, nombre de donateurs, leaders actifs, progression par projet
- **Historique complet** avec filtres par projet, responsable et statut
- **Espace personnel** pour chaque leader avec classement et lien de partage WhatsApp
- **Contrôle d'accès par rôle** : Super Admin et Leader

---

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Framework | Next.js 14 (App Router) |
| Langage | TypeScript 5 |
| Base de données | Supabase (PostgreSQL) |
| Authentification | Supabase Auth (email/mot de passe) |
| Fonctions serverless | Supabase Edge Functions (Deno) |
| Paiements | Stripe API |
| Style | Tailwind CSS |
| Icônes | Lucide React |

---

## Structure des pages

### Pages publiques

| Route | Description |
|-------|-------------|
| `/login` | Connexion par email et mot de passe |
| `/don` | Formulaire de don public (supporte `?ref=slug` pour attribution à un responsable) |

### Pages protégées (authentification requise)

| Route | Accès | Description |
|-------|-------|-------------|
| `/dashboard` | Tous | Vue d'ensemble : statistiques globales et activité récente |
| `/historique` | Super Admin | Historique complet des dons avec filtres |
| `/projets` | Super Admin | Gestion des projets (créer, modifier, supprimer) |
| `/responsables` | Super Admin | Gestion des leaders et génération de liens de don |
| `/mon-espace` | Leader | Statistiques personnelles, classement et lien de partage |
| `/ajouter-don` | Tous | Enregistrement manuel d'un don en espèces |

---

## Schéma de base de données

### Tables

**`profiles`** — Profils utilisateurs (liés à `auth.users`)
- `id` (UUID, PK) — Référence vers `auth.users.id`
- `email` (text)
- `nom` (text)
- `role` — `super_admin` | `leader`
- `created_at` (timestamptz)

**`leaders`** — Responsables de collecte
- `id` (UUID, PK)
- `user_id` (UUID, FK → `profiles.id`, nullable)
- `nom_affichage` (text)
- `slug` (text, UNIQUE) — Identifiant URL pour le lien de don
- `created_at` (timestamptz)

**`projects`** — Projets caritatifs
- `id` (UUID, PK)
- `nom` (text)
- `description` (text)
- `objectif` (numeric) — Objectif de collecte en euros
- `created_at` (timestamptz)

**`donors`** — Donateurs
- `id` (UUID, PK)
- `nom` (text)
- `created_at` (timestamptz)

**`donations`** — Transactions de dons
- `id` (UUID, PK)
- `donor_id` (UUID, FK → `donors.id`)
- `leader_id` (UUID, FK → `leaders.id`)
- `project_id` (UUID, FK → `projects.id`)
- `montant` (numeric) — Montant en euros (> 0)
- `methode` — `stripe` | `paypal` | `cash`
- `statut` — `paid` | `pending` | `cash_validated`
- `created_at` (timestamptz)

> RLS (Row-Level Security) activé sur toutes les tables.

---

## Edge Functions

### `create-payment-intent`
Initialise un `PaymentIntent` Stripe pour les dons par carte.
- **Entrée :** `{ amount, currency, metadata: { donor_name, leader_id, project_id } }`
- **Sortie :** `{ clientSecret }` pour la confirmation côté client

### `stripe-webhook`
Reçoit les événements Stripe (`payment_intent.succeeded`) et enregistre le don en base.
- Vérifie la signature Stripe
- Crée les enregistrements `donors` et `donations`
- Utilise la `SERVICE_ROLE_KEY` pour contourner le RLS

---

## Variables d'environnement

Copier `.env.example` vers `.env` et renseigner les valeurs.

```env
# Supabase (public)
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Stripe (public)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Stripe (serveur uniquement — à configurer dans les secrets Supabase)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Secrets Edge Functions (Supabase Dashboard > Edge Functions > Secrets)

| Nom | Description |
|-----|-------------|
| `STRIPE_SECRET_KEY` | Clé secrète Stripe |
| `STRIPE_WEBHOOK_SECRET` | Secret de signature webhook Stripe |
| `SUPABASE_URL` | URL du projet Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé service Supabase (accès admin DB) |

---

## Installation locale

```bash
# Installer les dépendances
npm install

# Lancer le serveur de développement
npm run dev

# Vérification des types
npm run typecheck

# Build de production
npm run build
```

---

## Flux de paiement

### Don par carte (Stripe)
1. Le donateur remplit le formulaire sur `/don`
2. L'app appelle l'edge function `create-payment-intent`
3. Stripe Elements collecte les données de carte
4. Stripe confirme le paiement
5. Le webhook Stripe appelle `stripe-webhook`
6. Le don est enregistré avec `statut: 'paid'`

### Don en espèces
1. Un responsable ou admin saisit le don via `/ajouter-don`
2. Le donateur est créé en base (ou existant)
3. Le don est enregistré avec `methode: 'cash'` et `statut: 'cash_validated'`

---

## Rôles et accès

| Fonctionnalité | Super Admin | Leader |
|----------------|:-----------:|:------:|
| Dashboard global | ✓ | ✓ (lecture) |
| Historique complet | ✓ | — |
| Gestion des projets | ✓ | — |
| Gestion des responsables | ✓ | — |
| Espace personnel | ✓ | ✓ |
| Ajouter un don (espèces) | ✓ | ✓ |
