---
name: Coaching Life
description: Plateforme de coaching - vitrine chaleureuse + dashboard, identité terracotta
colors:
  brand-primary: "oklch(51.9% 0.121 22.8)"
  brand-mid: "oklch(68.6% 0.117 21.2)"
  brand-wash: "oklch(97.2% 0.011 17.3)"
  brand-soft: "oklch(93.8% 0.026 17.6)"
  brand-deep: "oklch(26.7% 0.057 23.3)"
  neutral-bg: "#f8fafc"
  neutral-text: "#1e293b"
  neutral-muted: "#64748b"
  neutral-border: "#e2e8f0"
typography:
  display:
    fontFamily: "Bricolage Grotesque, Hanken Grotesk, sans-serif"
    fontSize: "clamp(2.25rem, 4vw + 1rem, 4rem)"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Bricolage Grotesque, sans-serif"
    fontSize: "clamp(1.875rem, 3vw, 2.25rem)"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Hanken Grotesk, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    letterSpacing: "0.05em"
rounded:
  lg: "0.5rem"
  xl: "0.75rem"
  2xl: "1rem"
  full: "9999px"
spacing:
  tight: "0.75rem"
  base: "1.5rem"
  section: "clamp(3.5rem, 8vw, 7rem)"
  section-lg: "clamp(4rem, 10vw, 9rem)"
components:
  button-primary:
    backgroundColor: "{colors.brand-primary}"
    textColor: "{colors.neutral-bg}"
    rounded: "{rounded.full}"
    padding: "1rem 2rem"
  button-primary-hover:
    backgroundColor: "{colors.brand-deep}"
    textColor: "{colors.neutral-bg}"
    rounded: "{rounded.full}"
    padding: "1rem 2rem"
  card:
    backgroundColor: "#ffffff"
    textColor: "{colors.neutral-text}"
    rounded: "{rounded.2xl}"
    padding: "1.5rem"
  input:
    backgroundColor: "{colors.neutral-bg}"
    textColor: "{colors.neutral-text}"
    rounded: "{rounded.xl}"
    padding: "0.75rem 1rem"
  panel-tinted:
    backgroundColor: "{colors.brand-wash}"
    textColor: "{colors.neutral-text}"
    rounded: "{rounded.2xl}"
    padding: "2rem"
---

# Design System: Coaching Life

## 1. Overview

**Creative North Star: « Le Foyer Rassurant »**

Coaching Life accueille des visiteurs souvent en recherche émotionnelle, parfois fragiles, majoritairement sur mobile. L'interface doit produire la sensation d'entrer dans un lieu chaleureux et sûr, pas dans un tunnel de conversion. La chaleur vient de la **composition** (rythme, respiration, terracotta assumé) et du **ton**, jamais d'effets décoratifs. La crédibilité se montre par la clarté de l'offre et la fluidité du parcours de réservation, pas par des superlatifs.

Le système repose sur une identité **terracotta / rose poudré** (OKLCH) posée sur des neutres slate tièdes, une typographie humaniste à voix (display chaleureux + sans lisible), et un rythme vertical fluide qui respire en grand sur desktop et se resserre sur mobile. Deux registres cohabitent : la **vitrine** (brand : le design EST le produit, stratégie couleur Committed) et le **dashboard** (product : sobre, une seule couleur d'accent, la couleur sert l'action).

Ce que le système rejette explicitement : le **template SaaS générique** (Calendly/Squarespace, grilles de cards icône+titre+texte répétées, hero-métrique, dégradés arc-en-ciel génériques) ; le **cliché wellness** (lavande/galets zen, vert-sauge + serif fin) ; la **froideur corporate** (dark observability, fintech navy-and-gold).

**Key Characteristics:**
- Terracotta load-bearing, pas saupoudré (Committed sur la vitrine)
- Typographie humaniste chaleureuse, jamais Inter par défaut
- Rythme d'espacement fluide via `clamp()`, jamais uniforme
- Une décision à la fois (divulgation progressive), zéro mouvement non sollicité
- Mobile-first réel, WCAG AA, public potentiellement neuroatypique

## 2. Colors

Palette mono-chromatique chaude : une seule famille terracotta déclinée en 11 paliers OKLCH, sur des neutres slate. Aucune couleur catégorielle arc-en-ciel.

### Primary
- **Terracotta Profond** (`oklch(51.9% 0.121 22.8)`, brand-700) : couleur d'action (boutons primaires, liens, icônes clés, focus rings). C'est la voix de la marque.
- **Terracotta Doux** (`oklch(68.6% 0.117 21.2)`, brand-500) : pastilles de disponibilité, accents secondaires, ring de sélection.

### Neutral
- **Crème Slate** (`#f8fafc`, slate-50) : fond global, tiède plutôt que blanc clinique.
- **Ardoise Texte** (`#1e293b`, slate-800) : texte courant ; `slate-600`/`slate-500` pour le secondaire.
- **Liseré Slate** (`#e2e8f0`, slate-200 / slate-100) : bordures hairline, dividers.

### Named Rules
**The Single Hue Rule.** Une seule famille de teinte (terracotta) porte toute l'identité. Aucune couleur catégorielle (violet, ambre, teal, sky) n'est autorisée pour « différencier » des cartes ou des séries : la différenciation passe par le label, l'icône et l'espace, pas par l'arc-en-ciel.

**The Committed-on-Brand Rule.** Sur la vitrine, le terracotta porte des surfaces entières (hero baigné en `brand-50`, footer ancré en `brand-950`), pas seulement des accents ≤10%. Sur le dashboard, l'inverse : Restrained, la couleur ne sert que l'action et l'état.

## 3. Typography

**Display Font:** Bricolage Grotesque (fallback Hanken Grotesk, sans-serif)
**Body Font:** Hanken Grotesk (fallback ui-sans-serif, system-ui)

**Character:** Un grotesque humaniste chaleureux et légèrement irrégulier pour les titres (caractère, proximité humaine) posé sur un sans humaniste neutre et très lisible pour le corps. Contraste display-caractère vs texte-neutre, renforcé par le contraste de graisse. Ni Inter par défaut, ni serif éditorial.

### Hierarchy
- **Display** (700, `clamp(2.25rem, 4vw + 1rem, 4rem)`, line-height 1.05, tracking -0.02em) : titre hero uniquement.
- **Headline** (700, `clamp(1.875rem, 3vw, 2.25rem)`, line-height 1.15) : titres de section (h2).
- **Title** (600, 1.25–1.5rem) : titres de cartes, en-têtes de panneaux.
- **Body** (400, 1.125rem, line-height 1.6) : texte courant. Largeur de ligne plafonnée 65–75ch.
- **Label** (600, 0.875rem, tracking 0.05em) : badges-pilule, métadonnées.

### Named Rules
**The No-Inter Rule.** Inter (et les serifs réflexes Fraunces/Lora/Playfair/Cormorant) sont interdits : ils signent une identité générique de template. Le couple Bricolage + Hanken est l'identité.

## 4. Elevation

Système majoritairement **plat avec ombres subtiles**. Les cartes posent une `shadow-sm` au repos, montent en `shadow-md`/`shadow-lg` au hover. Aucune ombre dramatique, aucun glow coloré. Le glassmorphism (`backdrop-blur`) est réservé aux surfaces fonctionnelles persistantes (header sticky, barres de sauvegarde), jamais décoratif.

### Shadow Vocabulary
- **Repos** (`box-shadow: 0 1px 2px rgba(15,23,42,0.05)`, shadow-sm) : cartes, panneaux au repos.
- **Hover** (`box-shadow: 0 10px 15px -3px rgba(15,23,42,0.1)`, shadow-lg) : élévation de réponse au survol.
- **Accent CTA** (`shadow-brand-500/25`) : halo terracotta diffus sous les boutons primaires et l'état sélectionné.

### Named Rules
**The Flat-By-Default Rule.** Les surfaces sont plates au repos ; l'ombre est une réponse à l'état (hover, sélection, focus), pas une décoration permanente. Pas de card qui « lévite » via `translate` au hover.

## 5. Components

### Buttons
- **Shape:** entièrement arrondi (`rounded-full`, 9999px) pour les CTA vitrine ; `rounded-xl` (0.75rem) pour les actions dashboard.
- **Primary:** fond `brand-700`, texte blanc, padding `1rem 2rem`, `shadow-md`.
- **Hover / Focus:** fond `brand-800`, `focus-visible:ring-2 ring-brand-500 ring-offset-2`. Transition de couleur uniquement.
- **Secondary:** fond blanc, bordure `slate-200`, texte `slate-700`.

### Chips / Badges
- **Pilule** (`rounded-full`, `bg-brand-100 text-brand-700`, tracking 0.05em) : badge de section, compteur « non lus ».
- **Statut** (dashboard) : paires teintées sémantiques (`bg-amber-100 text-amber-800` en attente, `bg-emerald-100` confirmé, `bg-red-100` annulé, `bg-slate-200` terminé). Les services partagent une pilule brand unique.

### Cards / Containers
- **Corner Style:** `rounded-2xl` (1rem).
- **Background:** blanc sur fond crème ; **panneau tinté** `brand-50/60` + bordure `brand-100` quand le bloc doit porter de la chaleur (points clés des pages thématiques).
- **Shadow Strategy:** cf. Elevation (plat au repos, `shadow-lg` au hover si actionnable).
- **Border:** hairline `slate-100`. Jamais de bordure latérale colorée (>1px).
- **Internal Padding:** `1.5rem` (cards) à `2rem` (panneaux).

### Inputs / Fields
- **Style:** fond `slate-50`, bordure `slate-200`, `rounded-xl`. Label lié, `aria-required`.
- **Focus:** `focus:ring-2 ring-brand-500/20 border-brand-500`.
- **Error:** message `role="alert"`, texte `red-700` sur `red-50`.

### Navigation
- **Header:** sticky, `bg-white/80 backdrop-blur-md`, liens `slate-600` → hover `brand-700`. Burger mobile avec `aria-expanded` + focus-visible.
- **Footer:** ancré en `brand-950` (terracotta sombre), texte `brand-100/80`, liens hover blanc.

### Calendrier de réservation (signature)
- Grille `role="grid"`, jours = `<button>` `h-11` (44px tactile) avec `aria-label` date complète + statut, `aria-pressed`, `aria-current="date"`. Sélection en `brand-700`, aujourd'hui en `brand-50`, indisponible en `red-50/red-400`. Divulgation progressive : créneaux puis formulaire n'apparaissent qu'après sélection.

## 6. Do's and Don'ts

### Do:
- **Do** assumer le terracotta sur des surfaces entières côté vitrine (hero baigné, footer ancré) : la couleur est la voix.
- **Do** porter la hiérarchie par l'échelle fluide (`clamp`) et le contraste de graisse Bricolage/Hanken.
- **Do** varier le rythme vertical (`section-y` / `section-y-lg`) : respiration généreuse entre sections, regroupement serré à l'intérieur.
- **Do** garder une seule couleur d'accent au dashboard ; la couleur sert l'action et l'état.
- **Do** fournir focus-visible, `aria-label` et cibles tactiles ≥44px sur tout composant interactif.

### Don't:
- **Don't** réintroduire Inter ni les serifs réflexes (Fraunces/Lora/Playfair/Cormorant).
- **Don't** différencier des cartes/séries par des couleurs catégorielles (violet, ambre, teal, sky) : c'est du template arc-en-ciel générique.
- **Don't** retomber dans le template SaaS : grilles de cards icône+titre+texte répétées, hero-métrique, dégradés violet-bleu.
- **Don't** utiliser de bordure latérale colorée >1px, de gradient text, ni de glassmorphism décoratif.
- **Don't** imposer du mouvement non sollicité (auto-scroll, carrousels automatiques) : public potentiellement neuroatypique, WCAG 2.2.2.
- **Don't** mettre du texte gris sur fond coloré ni du `#000`/`#fff` purs sur de grandes surfaces.
