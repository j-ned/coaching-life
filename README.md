<div style="text-align: center">

# Coaching Life

### Plateforme de coaching professionnel & personnel

**Réservation en ligne · SSR Angular · Passwordless · Dashboard analytics**

[![Angular](https://img.shields.io/badge/Angular-22-DD0031?logo=angular&logoColor=white)](https://angular.dev)
[![Hono](https://img.shields.io/badge/Hono-4-E36002?logo=hono&logoColor=white)](https://hono.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Tailwind](https://img.shields.io/badge/Tailwind-v4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)

[**Démo live**](https://coaching-life.nedellec-julien.fr) · [**Captures**](#captures-décran) · [**Architecture**](#architecture)

![Coaching Life - Page d'accueil](public/screen/hero-dark.png)

</div>

---

## Sommaire

- [Le besoin](#le-besoin)
- [Fonctionnalités](#fonctionnalités)
- [Choix techniques marquants](#choix-techniques-marquants)
- [Architecture](#architecture)
- [Stack technique](#stack-technique)
- [Captures d'écran](#captures-décran)
- [Installation](#installation)

---

## Le besoin

Les coachs indépendants ont besoin d'une **vitrine crédible**, d'un **système de réservation intégré**, et d'un **dashboard d'analyse** pour mesurer leur activité, sans passer par des plateformes comme Calendly + Squarespace + Stripe qui fragmentent l'expérience utilisateur et coûtent cher.

**Coaching Life** est une application unifiée pensée pour les coachs en développement personnel, parentalité et accompagnement professionnel.

## Fonctionnalités

### Côté utilisateurs

| Feature | Détails |
|---------|---------|
| **Vitrine SEO-friendly** | Rendu côté serveur (SSR) pour indexation optimale |
| **Réservation en ligne** | Créneaux synchronisés, confirmation email automatique |
| **Carousels tactiles** | UX mobile-first avec gestes natifs |
| **Authentification passwordless** | Magic links par email, zéro friction |

### Côté coach (dashboard)

| Feature | Détails |
|---------|---------|
| **Analytics visiteurs** | Charts Chart.js : trafic, conversions, pics d'activité |
| **Gestion des RDV** | Vue agenda avec statuts (confirmé, annulé, reporté) |
| **Historique clients** | Suivi des séances par profil |
| **Thèmes de coaching** | Coach de Vie, Développement personnel, Coaching Équipes, Parents neuroatypiques |

---

## Choix techniques marquants

### 1. Prerender (SSG) pour le SEO

Un site de coach qui n'apparaît pas sur Google = un site invisible. Choix : **prérendu au build** (`@angular/ssr`, `RenderMode.Prerender`) des pages publiques, un `index.html` statique par route, avec `<title>`, `canonical`, Open Graph et description **propres à chaque page**. Servi tel quel par Hono, donc indexable par tous les crawlers (y compris sans JS). Le dashboard reste en rendu client (`RenderMode.Client`).

```mermaid
sequenceDiagram
  participant B as Build (CI)
  participant A as Angular Prerender
  participant H as Hono (runtime)
  participant G as Crawler Google

  B->>A: build, prerender routes publiques
  A-->>B: /life-coach/index.html (SEO par route)
  G->>H: GET /life-coach
  H-->>G: HTML statique indexable
  Note over H,G: contenu live + dashboard chargés<br/>côté client après hydratation
```

### 2. Signals + hydratation

Change detection basée sur Signals côté composants, avec `provideClientHydration(withEventReplay())` pour reprendre le DOM SSR sans flash côté client.

### 3. Authentification passwordless (magic links)

- L'utilisateur entre son email et reçoit un lien unique signé (JWT avec TTL 15min)
- Clic sur le lien : JWT échangé contre session
- Zéro mot de passe à gérer côté utilisateur

### 4. Chart.js via ng2-charts

Plutôt que de réimplémenter des graphiques SVG custom, le dashboard utilise `ng2-charts` : gain de temps, et les charts sont suffisamment simples (ligne, barres, donut).

---

## Architecture

```
coaching-life/
├── src/
│   ├── app/
│   │   ├── features/              # features par domaine métier
│   │   │   ├── coaching/          # services de coaching
│   │   │   ├── booking/           # réservation
│   │   │   ├── auth/              # magic links
│   │   │   └── admin/             # dashboard coach
│   │   ├── shared/                # UI, icons, analytics
│   │   └── layout/                # header, footer
│   ├── server.ts                  # bootstrap SSR Angular (build)
│   └── main.ts                    # bootstrap client
├── backend/                       # API Hono
│   ├── src/
│   │   ├── routes/                # booking, auth, analytics
│   │   ├── db/                    # Drizzle schema
│   │   └── lib/                   # email (magic links), S3
│   └── drizzle/
└── Dockerfile                     # multi-stage SSR + backend
```

En production, le backend Hono sert directement les fichiers statiques buildés par Angular SSR (`serveStatic`) : un seul processus Node exposé derrière Traefik, pas de serveur Express séparé au runtime.

---

## Stack technique

### Frontend

- **Framework** : Angular 22 (Signals, standalone)
- **SSR** : `@angular/ssr`
- **Styling** : TailwindCSS v4
- **Charts** : Chart.js 4 via `ng2-charts`
- **Tests** : Vitest
- **Quality** : Husky (pre-commit), Prettier

### Backend

- **Runtime** : Node.js + Hono
- **ORM** : Drizzle ORM + drizzle-kit
- **Database** : PostgreSQL
- **Validation** : Zod + `@hono/zod-validator`
- **Auth** : Magic links via `jose` (JWT) + Nodemailer
- **Hashing** : bcryptjs (pour les comptes coach)
- **Storage** : AWS S3 (uploads clients)

### DevOps

- **Container** : Docker multi-stage (Angular SSR + API)
- **Reverse proxy** : Traefik
- **Déploiement** : VPS OVH / Dokploy

---

## Captures d'écran

### Page d'accueil (dark mode)

![Hero dark](public/screen/hero-dark.png)

### Page d'accueil (light mode)

![Hero light](public/screen/hero-light.png)

### Vue complète

![Full page](public/screen/full-dark.png)

---

## Installation

```bash
# 1. Cloner
git clone https://github.com/j-ned/coaching-life.git
cd coaching-life

# 2. Installer (workspace pnpm)
pnpm install

# 3. Frontend
pnpm start
# http://localhost:4200 (dev)
# pnpm build && pnpm serve:ssr:coaching-life (SSR prod)

# 4. Backend
cd backend
cp .env.example .env
pnpm db:migrate
pnpm dev
```

---

<div style="text-align: center">

**Développé par [Julien Nedellec](https://j-ned.dev)**

[![Portfolio](https://img.shields.io/badge/Portfolio-j--ned.dev-4f46e5)](https://j-ned.dev)
[![GitHub](https://img.shields.io/badge/GitHub-j--ned-181717?logo=github)](https://github.com/j-ned)

</div>
