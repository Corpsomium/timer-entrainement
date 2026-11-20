# Screenshots UX — PR #10

Captures d'écran des améliorations UX implémentées dans la PR #10, testées sur trois tailles de viewport :
- **Mobile** : 390×844 (iPhone 14 Pro)
- **Tablet** : 820×1180 (iPad)
- **Desktop** : 1440×900

## Catalogue par viewport

### Mobile (390×844)

1. `mobile-01-input.png` — Écran de saisie vide
2. `mobile-02-input-filled.png` — Texte d'exercices rempli
3. `mobile-03-overview.png` — Aperçu avec stats (3 exercices, total séries, repos)
4. `mobile-04-rest-adjusted.png` — Temps de repos ajusté avec steppers ±15s
5. `mobile-05-card-expanded.png` — Carte exercice expandée (accordion)
6. `mobile-07-session-ready.png` — Session ready phase avec action sticky bottom
7. `mobile-09-rest-phase.png` — Repos avec timer hero et actions sticky
8. `mobile-10-overview-with-stepper.png` — Overview avec stepper rest time visible en haut
9. `mobile-11-card-expanded.png` — Carte expanded avec bouton "Changer l'image"
10. `mobile-12-image-picker-overview.png` — **Image picker ouvert depuis overview** (bottom sheet)
11. `mobile-13-session-ready.png` — Session ready avec bouton ✎ en haut à droite
12. `mobile-14-image-picker-session.png` — **Image picker ouvert depuis session** (bottom sheet)
13. `mobile-16-rest-phase.png` — Rest phase avec sticky actions

### Tablet (820×1180)

1. `tablet-01-input.png` — Écran de saisie vide
2. `tablet-02-input-filled.png` — Texte d'exercices rempli
3. `tablet-03-overview.png` — Aperçu (max-width 900px, images plus grandes)
4. `tablet-04-rest-adjusted.png` — Temps de repos ajusté
5. `tablet-05-card-expanded.png` — Carte exercice expandée
6. `tablet-07-session-ready.png` — Session ready (actions inline, pas sticky)
7. `tablet-09-rest-phase.png` — Repos avec timer
8. `tablet-10-overview-with-stepper.png` — Overview avec stepper rest time
9. `tablet-11-card-expanded.png` — Carte expanded avec images larges
10. `tablet-12-image-picker-overview.png` — **Image picker ouvert depuis overview** (modal centré)
11. `tablet-13-session-ready.png` — Session ready avec bouton ✎
12. `tablet-14-image-picker-session.png` — **Image picker ouvert depuis session** (modal centré)
13. `tablet-16-rest-phase.png` — Rest phase

### Desktop (1440×900)

1. `desktop-01-input.png` — Écran de saisie vide
2. `desktop-02-input-filled.png` — Texte d'exercices rempli
3. `desktop-03-overview.png` — Aperçu (max-width 900px centré)
4. `desktop-04-rest-adjusted.png` — Temps de repos ajusté
5. `desktop-05-card-expanded.png` — Carte exercice expandée
6. `desktop-07-session-ready.png` — Session ready
7. `desktop-09-rest-phase.png` — Repos avec timer
8. `desktop-10-overview-with-stepper.png` — Overview avec stepper rest time
9. `desktop-11-card-expanded.png` — Carte expanded
10. `desktop-12-image-picker-overview.png` — **Image picker ouvert depuis overview** (modal centré)
11. `desktop-13-session-ready.png` — Session ready avec bouton ✎
12. `desktop-14-image-picker-session.png` — **Image picker ouvert depuis session** (modal centré)
13. `desktop-16-rest-phase.png` — Rest phase

## Fonctionnalités illustrées

### Lightbox (non capturé car pas d'illustrations dans exemple)
- Tap sur image (session/overview) → lightbox avec frames "départ"/"fin"
- Navigation keyboard (←/→), boutons prev/next
- Fermeture Escape, bouton close, clic backdrop

### Responsive layout
- **Mobile** : sticky actions bottom, pleine largeur
- **Tablet** : max-width 900px, images 400px, actions inline
- **Desktop** : max-width 900px centré, layout identique tablet

### Accordion dans overview
- Tap sur carte → expansion in-place (280ms ease-out)
- Affiche images larges, sets/reps/charge/superset
- Bouton "Changer l'image" → ouvre picker

### Temps de repos éditable in-place
- Steppers ±15s dans stat en haut (32px tap targets)
- Limites : min 15s, max 600s
- Contrôle redondant bas supprimé

### Bottom sticky actions (mobile)
- Boutons primaires dans thumb zone (<600px)
- Safe-area-inset-bottom pour notch iPhone
- Rest : "Passer" en ghost (timer hero)

### **Image picker** (NOUVEAU dans PR #10)

#### Accès depuis Overview
1. Taper sur carte exercice → expand
2. Bouton "Changer l'image" en bas de la carte
3. → Ouvre picker avec recherche préfilled (FR→EN mapping)

Screenshots : `*-12-image-picker-overview.png`

#### Accès depuis Session
1. Session ready phase affiche exercice et images
2. Bouton ✎ en haut à droite du titre exercice
3. → Ouvre picker avec recherche préfilled

Screenshots : `*-14-image-picker-session.png`

#### Fonctionnalités picker
- **Recherche** : champ texte préfilled avec mapping FR→EN
- **Grid résultats** : candidats free-exercise-db (grid responsive)
- **Sélection** : click sur card → highlight lime
- **Primary frame** : si >1 frame, choix de la frame principale
- **Actions** :
  - "Retirer l'image" (si illustration actuelle existe)
  - "Annuler" / "Confirmer"
- **Fermeture** : Escape, backdrop click, bouton close
- **Persistance** : sauvegarde dans localStorage (illustration history)
- **Layout** :
  - Mobile : bottom sheet (slide-up animation)
  - Tablet/Desktop : modal centré (fade + scale animation)

## Tests

✅ Build SUCCESS  
✅ TypeScript PASS  
✅ Tests unitaires 10/10 PASS  
✅ Screenshots capturés aux 3 viewports  
✅ Picker accessible depuis overview et session  
✅ Recherche fonctionnelle  
✅ Sélection et persistance OK  
✅ Transitions smooth sans flash

## Notes techniques

- **Image picker** : nouveau composant `ImagePicker.tsx`
- **Recherche** : utilise `searchExercises()` de `illustrations.ts`
- **Mapping FR→EN** : table interne dans ImagePicker pour query initiale
- **Persistance** : `updateExerciseIllustration()` avec flag `manual: true`
- **Bottom sheet** : CSS animation `slide-up` sur mobile
- **Modal centré** : CSS animation `modal-in` sur tablet/desktop
- **Z-index** : 2000 (au-dessus lightbox qui est 1000)

## Fichiers modifiés

- **Nouveau** : `src/components/ImagePicker.tsx`
- **Modifié** :
  - `src/App.tsx` — passe updateExerciseIllustration
  - `src/components/OverviewScreen.tsx` — intègre picker dans expanded card
  - `src/components/SessionScreen.tsx` — intègre picker avec bouton ✎
  - `src/index.css` — styles picker (bottom sheet + modal)
- **Tests** : `test-picker.mjs` — script capture screenshots
- **Docs** : ce README
