# Améliorations UX et responsive — PR #10

## Résumé

Cette PR implémente les améliorations UX demandées pour optimiser l'application pour un usage en salle de sport :
- Lightbox pour zoom des images d'exercices
- Layout responsive pour mobile/tablet/desktop
- Accordion pour expansion des cartes d'exercices
- Temps de repos éditable in-place
- Actions sticky en bas sur mobile pour ergonomie pouce

## 1. Lightbox pour images d'exercices

### Fonctionnalités
- **Tap sur image** → ouvre lightbox avec les deux frames (départ/fin) en grand
- **Navigation** : flèches gauche/droite pour changer de frame
- **Keyboard** : Escape pour fermer, flèches pour naviguer
- **Fermeture** : clic sur fond semi-transparent
- **Transition** : morphing subtil depuis miniature (view-transition)

### Implémentation
- Nouveau composant `Lightbox.tsx`
- Intégré dans `SessionScreen` (dual-frame cliquable)
- Intégré dans `OverviewScreen` (images expanded cliquables)
- Labels "départ" / "fin" en overlay
- Compteur frame actuelle / total

### Accessibilité
- `role="dialog"` et `aria-modal="true"`
- Keyboard trap dans la modale
- Focus management (Escape prioritaire)

### Screenshots
- `mobile-06-lightbox.png` (si illustration présente)
- `tablet-06-lightbox.png`
- `desktop-06-lightbox.png`
- `mobile-08-session-lightbox.png` (depuis session)

## 2. Layout responsive

### Breakpoints
- **Mobile** : <600px → sticky actions, layout simple colonne
- **Tablet** : 800px-1024px → wrap max-width 900px, images plus grandes (400px)
- **Desktop** : >1024px → layout deux colonnes optionnel pour session

### Ajustements par viewport

#### Mobile (390×844)
- Content pleine largeur avec padding
- Images exercices : 100% largeur container
- Actions sticky en bas (thumb zone)
- Spacing optimisé pour scroll rapide

#### Tablet (820×1180)
- Max-width 900px centré
- Images exercices : max 400px
- Layout une colonne mais plus spacieux
- Actions inline (pas sticky)

#### Desktop (1440×900)
- Max-width 900px centré
- Même layout que tablet
- Session optionnellement deux colonnes (`.session-layout`)

### CSS responsive
```css
@media (min-width: 800px) {
  .wrap { max-width: 900px; }
  .ex-img-dual { max-width: 400px; }
}

@media (min-width: 1024px) {
  .session-layout {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-8);
  }
}

@media (max-width: 600px) {
  .actions-sticky {
    position: fixed;
    bottom: 0;
    padding-bottom: calc(var(--space-3) + env(safe-area-inset-bottom));
  }
}
```

## 3. Accordion dans Overview

### Fonctionnalités
- **Tap sur carte** → expansion in-place avec animation smooth (280ms ease-out)
- **Images** : affiche les deux frames en grand (grid responsive)
- **Détails** : sets / reps / charge / tag superset
- **Action** : bouton "Changer l'image" → retour à input screen
- **Images cliquables** → ouvre lightbox

### Animation
- `expand-in` keyframe : opacity 0→1, translateY -8px→0
- Transition 280ms (timing optimisé gym, pas 350ms trop lent)
- Border-top pour séparer header/details

### Layout expanded
- Grid auto-fit minmax(200px, 1fr) pour images
- Labels départ/fin en overlay
- Info rows avec flex space-between
- Hover scale 1.02 sur images pour affordance

### Détails affichés
- Séries (nombre)
- Répétitions (nombre)
- Charge (si présente)
- Tag superset (pill lime si présent)

### Accessibilité
- Bouton expand/collapse avec aria-expanded
- aria-label "Développer" / "Réduire"
- Focus visible sur expand icon
- Large tap target (28px minimum)

## 4. Temps de repos éditable in-place

### Problème résolu
- Avant : stat affichage seul en haut + input redondant en bas
- Après : stat éditable avec steppers ±15s, input bas supprimé

### Fonctionnalités
- **Steppers ±15s** : boutons - / + de chaque côté de la valeur
- **Limites** : min 15s, max 600s (10 min)
- **Désactivation** : steppers disabled aux bornes avec opacity 0.3
- **Persistance** : saveRest() appelé à chaque changement
- **Source unique** : un seul contrôle, une seule vérité

### UI
- Boutons circulaires 32px (large tap target)
- Hover : background + border lime + scale 1.05
- Active : scale 0.95
- Focus : outline 2px lime avec offset 2px

### CSS
```css
.btn-stepper {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--bg-2);
  border: 1px solid var(--line);
  transition: all 150ms ease;
}
```

## 5. Bottom sticky actions (mobile)

### Problème ergonomique
- Mains moites, lecture à bout de bras, usage d'une main
- Boutons primaires doivent être dans la thumb zone (bas de l'écran)

### Implémentation
- `.actions-sticky` : position fixed en bas sur mobile (<600px)
- `.actions-sticky-spacer` : div vide pour réserver l'espace
- `safe-area-inset-bottom` : padding pour iPhone notch/home indicator
- Z-index 100 pour rester au-dessus du contenu

### Écrans concernés
1. **Overview** : "Commencer" / "Reprendre la séance"
2. **Session Ready** : "Démarrer" / "Série terminée"
3. **Session Work** : "Terminer la série"
4. **Session Rest** : "Passer" + ajustements ±15s

### Changement Rest screen
- Avant : bouton "Passer" en orange (primary)
- Après : bouton "Passer" en ghost (secondary)
- Raison : le timer est le hero, l'action est secondaire

### CSS
```css
@media (max-width: 600px) {
  .actions-sticky {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: var(--bg);
    padding: var(--space-3) var(--space-4);
    padding-bottom: calc(var(--space-3) + var(--safe-b));
    border-top: 1px solid var(--line);
    z-index: 100;
  }
  
  .actions-sticky-spacer {
    height: calc(56px + var(--space-3) * 2 + var(--safe-b));
  }
}
```

## Tokens design

### Spacing (système 4px)
```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-7: 28px;
--space-8: 32px;
--space-9: 36px;
--space-10: 40px;
```

### Radius
```css
--radius-sm: 8px;
--radius-md: 12px;
--radius-lg: 16px;
--radius-xl: 20px;
```

### Motion (optimisé gym)
```css
--duration-exit: 180ms;
--duration-enter: 220ms;
--duration-move: 280ms;
```

## Préservé

### View transitions
- Pas de flash : `animation-fill-mode: both`, pas de délai
- Crossfades simultanés pour tous les pseudo-éléments
- Support prefers-reduced-motion (0s duration)

### Logique workout
- Timer auto-advance avec startTransition()
- Superset format et grouping
- Illustration mapping et primaryFrame
- Wake lock (écran reste allumé)
- Vibration feedback (countdown 3-2-1 + completion)

### Tests
- Build ✅ SUCCESS
- TypeScript ✅ PASS
- Tous les tests antérieurs préservés

## Screenshots par viewport

### Mobile (390×844)
1. `mobile-01-input.png` — écran de saisie vide
2. `mobile-02-input-filled.png` — texte rempli
3. `mobile-03-overview.png` — aperçu avec stats
4. `mobile-04-rest-adjusted.png` — rest time édité avec steppers
5. `mobile-05-card-expanded.png` — carte exercice expandée
6. `mobile-07-session-ready.png` — session ready phase avec sticky action
7. `mobile-09-rest-phase.png` — repos avec timer hero et Passer ghost

### Tablet (820×1180)
1. `tablet-01-input.png`
2. `tablet-02-input-filled.png`
3. `tablet-03-overview.png` — max-width 900px, images plus grandes
4. `tablet-04-rest-adjusted.png`
5. `tablet-05-card-expanded.png`
6. `tablet-07-session-ready.png` — actions inline (pas sticky)
7. `tablet-09-rest-phase.png`

### Desktop (1440×900)
1. `desktop-01-input.png`
2. `desktop-02-input-filled.png`
3. `desktop-03-overview.png` — max-width 900px centré
4. `desktop-04-rest-adjusted.png`
5. `desktop-05-card-expanded.png`
6. `desktop-07-session-ready.png`
7. `desktop-09-rest-phase.png`

## Emplacement contrôle "Changer l'image"

### Depuis Overview
1. Taper sur carte exercice → expand
2. Scroll vers bas de la carte expanded
3. Bouton "Changer l'image" en pleine largeur (`.btn-change-image`)
4. Retour à input screen pour modifier le texte

### Depuis Session
1. Les images sont affichées en dual-frame (si illustration disponible)
2. Tap sur image → lightbox
3. Pour changer : retour overview via bouton "Aperçu"

## Prochaines étapes possibles (hors scope)

- Modal picker d'illustrations dans l'app (sans retour à input)
- Swipe horizontal entre frames dans lightbox
- Pinch-to-zoom dans lightbox
- Session layout deux colonnes activé par défaut sur desktop
- Animation spring pour expansion accordion
- Haptic feedback (vibration) sur steppers

## Fichiers modifiés

### Nouveaux
- `src/components/Lightbox.tsx` — composant lightbox réutilisable
- `docs/ux-improvements.md` — cette documentation

### Modifiés
- `src/index.css` — responsive breakpoints, lightbox, accordion, steppers, sticky
- `src/components/SessionScreen.tsx` — lightbox integration, sticky actions
- `src/components/OverviewScreen.tsx` — accordion, rest steppers, lightbox, sticky actions
- `test-responsive.mjs` — script de capture screenshots multi-viewport

## Commits

1. `wip: integrate lightbox into SessionScreen`
2. `feat: make rest time editable in-place in overview`
3. `feat: add accordion expansion in overview cards`
4. `feat: add bottom sticky actions for mobile ergonomics`

## Tests manuels effectués

✅ Mobile 390×844 : sticky actions, steppers, accordion, transitions smooth
✅ Tablet 820×1180 : layout élargi, images plus grandes, actions inline
✅ Desktop 1440×900 : max-width centré, ergonomie desktop
✅ Lightbox : navigation keyboard, close Escape, backdrop click
✅ Rest steppers : ±15s, limites 15-600s, disabled aux bornes
✅ Accordion : expand/collapse, animation 280ms, images cliquables
✅ View transitions : pas de flash, crossfades simultanés
✅ prefers-reduced-motion : animations désactivées
