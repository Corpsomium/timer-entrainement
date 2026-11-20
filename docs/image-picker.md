# Image Picker — Documentation technique

## Vue d'ensemble

Le picker d'images permet de choisir une illustration depuis la base `free-exercise-db` avec recherche, sélection de la frame principale, et persistance dans localStorage.

## Points d'accès

### 1. Depuis Overview (carte expanded)

**Chemin utilisateur** :
1. Taper sur une carte exercice → expansion accordion
2. Scroll vers le bas de la carte
3. Bouton "Changer l'image" (pleine largeur, `.btn-change-image`)
4. → Ouvre picker

**Code** :
```tsx
// OverviewScreen.tsx, ligne ~310
<button 
  className="btn btn-ghost btn-change-image"
  onClick={(e) => {
    e.stopPropagation();
    onImageChange(exercise); // setPickerExercise
  }}
>
  Changer l'image
</button>
```

### 2. Depuis Session (ready phase)

**Chemin utilisateur** :
1. Session en cours, phase ready d'un exercice
2. Bouton ✎ en haut à droite du titre (`.btn-edit-image`)
3. → Ouvre picker

**Code** :
```tsx
// SessionScreen.tsx, ReadyPhase, ligne ~353
<button
  className="btn-edit-image"
  onClick={() => setPickerExercise(ex)}
  title="Changer l'image"
  aria-label="Changer l'image"
>
  ✎
</button>
```

**Positionnement** :
```css
/* index.css */
.btn-edit-image {
  position: absolute;
  top: var(--space-2);
  right: var(--space-2);
  width: 36px;
  height: 36px;
  border-radius: 50%;
  /* ... */
}
```

## Composant ImagePicker

### Props

```tsx
interface ImagePickerProps {
  exerciseName: string;                     // Nom exercice (français)
  currentIllustration: ExerciseIllustration | null; // Illustration actuelle
  onSelect: (illustration: ExerciseIllustration) => void; // Callback sélection
  onRemove: () => void;                     // Callback suppression
  onClose: () => void;                      // Callback fermeture
}
```

### Recherche

1. **Mapping FR→EN initial** :
   ```tsx
   const FR_TO_EN_SIMPLE: Record<string, string> = {
     'fentes arriere': 'reverse lunge',
     'developpe couche': 'bench press',
     // ... 30+ mappings
   };
   ```

2. **Prefill du champ** :
   ```tsx
   const normalized = normalizeExerciseName(exerciseName);
   const initialQuery = FR_TO_EN_SIMPLE[normalized] || exerciseName;
   const [query, setQuery] = useState(initialQuery);
   ```

3. **Recherche en temps réel** :
   ```tsx
   useEffect(() => {
     if (query.trim()) {
       const searchResults = searchExercises(query.trim(), 12);
       setResults(searchResults);
     } else {
       setResults([]);
     }
   }, [query]);
   ```

### Sélection et Primary Frame

1. **Sélection d'une illustration** :
   ```tsx
   const handleSelect = (illustration: ExerciseIllustration) => {
     setSelectedId(illustration.exerciseId);
     setPrimaryFrame(illustration.primaryFrame ?? 0);
   };
   ```

2. **Choix du primary frame** (si >1 frame) :
   ```tsx
   {isSelected && illustration.imageUrls.length > 1 && (
     <div className="image-picker-frames">
       <span>Frame principale :</span>
       {illustration.imageUrls.map((url, idx) => (
         <button
           className={`btn-frame ${primaryFrame === idx ? 'active' : ''}`}
           onClick={() => setPrimaryFrame(idx)}
         >
           <img src={url} />
         </button>
       ))}
     </div>
   )}
   ```

3. **Confirmation** :
   ```tsx
   const handleConfirm = () => {
     const selected = results.find((r) => r.exerciseId === selectedId);
     if (selected) {
       onSelect({ ...selected, primaryFrame });
     }
   };
   ```

### Suppression

```tsx
// ImagePicker.tsx
{currentIllustration && (
  <div className="image-picker-current">
    <span>Image actuelle :</span>
    <button className="btn btn-ghost btn-sm" onClick={onRemove}>
      Retirer l'image
    </button>
  </div>
)}

// OverviewScreen.tsx / SessionScreen.tsx
const handleRemoveIllustration = () => {
  if (pickerExercise) {
    const emptyIllustration: ExerciseIllustration = {
      exerciseId: '',
      imageUrls: [],
      name: pickerExercise.name,
      chosenAt: Date.now(),
      manual: true,
    };
    updateExerciseIllustration(pickerExercise.name, emptyIllustration);
    setPickerExercise(null);
  }
};
```

## Persistance

### updateExerciseIllustration

```tsx
// useIllustrations.ts
const updateExerciseIllustration = (
  exerciseName: string, 
  illustration: ExerciseIllustration
) => {
  const normalized = normalizeExerciseName(exerciseName);
  const newHistory = {
    ...history,
    [normalized]: { ...illustration, manual: true, chosenAt: Date.now() },
  };
  setHistory(newHistory);
  saveIllustrations(newHistory);
};
```

### Flag `manual: true`

- Empêche le remplacement automatique lors du prochain chargement
- L'illustration choisie manuellement est prioritaire sur le matching automatique

### localStorage

```tsx
// storage.ts
export function saveIllustrations(history: IllustrationHistory): void {
  try {
    localStorage.setItem(LS_ILLUSTRATIONS, JSON.stringify(history));
  } catch (e) {
    console.error('Failed to save illustrations', e);
  }
}
```

## Styles CSS

### Structure

```
.image-picker-backdrop          // Overlay rgba(0,0,0,0.85), z-index 2000
└── .image-picker-sheet         // Bottom sheet (mobile) / Modal (desktop)
    ├── .image-picker-header    // Titre + bouton close
    ├── .image-picker-exercise  // Nom exercice (lime highlight)
    ├── .image-picker-search    // Champ de recherche
    ├── .image-picker-current   // "Image actuelle" + "Retirer"
    ├── .image-picker-grid      // Grid de résultats
    │   └── .image-picker-card  // Card avec thumbnail + nom
    │       ├── .image-picker-thumbnail
    │       ├── .image-picker-card-name
    │       └── .image-picker-frames (si selected)
    │           └── .btn-frame (frame selector)
    └── .image-picker-actions   // Annuler / Confirmer
```

### Mobile (<800px) : Bottom Sheet

```css
.image-picker-backdrop {
  align-items: flex-end; /* Aligné en bas */
}

.image-picker-sheet {
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  max-height: 85vh;
  width: 100%;
  animation: slide-up 280ms ease-out;
}

@keyframes slide-up {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}
```

### Tablet/Desktop (≥800px) : Modal centré

```css
@media (min-width: 800px) {
  .image-picker-backdrop {
    align-items: center; /* Centré */
  }

  .image-picker-sheet {
    max-width: 700px;
    max-height: 80vh;
    border-radius: var(--radius-xl); /* Tous les coins */
    animation: modal-in 280ms ease-out;
  }

  @keyframes modal-in {
    from {
      opacity: 0;
      transform: scale(0.95) translateY(20px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }

  .image-picker-grid {
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  }
}
```

### Grid responsive

```css
.image-picker-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); /* Mobile */
  gap: var(--space-3);
  padding: var(--space-4);
  overflow-y: auto;
  flex: 1;
}

.image-picker-card {
  background: var(--card);
  border: 2px solid transparent;
  border-radius: var(--radius-md);
  overflow: hidden;
  cursor: pointer;
  transition: all 150ms ease;
}

.image-picker-card.selected {
  border-color: var(--lime);
  background: var(--hover);
}
```

## Flux de données

```
User clicks "Changer l'image" or ✎
  ↓
setPickerExercise(exercise)
  ↓
ImagePicker opens with:
  - exerciseName prefilled → FR→EN mapping → query
  - searchExercises(query, 12) → results grid
  ↓
User searches, selects card, chooses primaryFrame
  ↓
User clicks "Confirmer"
  ↓
onSelect({ ...illustration, primaryFrame })
  ↓
updateExerciseIllustration(exerciseName, illustration)
  ↓
newHistory[normalized] = { ...illustration, manual: true, chosenAt }
  ↓
saveIllustrations(newHistory) → localStorage
  ↓
setPickerExercise(null) → picker closes
  ↓
getIllustration(exerciseName) returns new illustration
  ↓
UI updates immediately (no reload needed)
```

## Keyboard shortcuts

- **Escape** : ferme le picker (useEffect cleanup)
- **Tab** : navigation normale (pas de keyboard trap custom pour simplifier)
- **Enter** : submit sur search input (navigateur natif)

## Tests

### Build
```bash
npm run build
# ✅ TypeScript PASS
# ✅ Vite build SUCCESS
```

### Tests unitaires
```bash
npm test
# ✅ 10/10 tests PASS
```

### Tests manuels (3 viewports)

Script : `test-picker.mjs`

Captures :
- Overview avec stepper rest time
- Card expanded avec bouton "Changer l'image"
- **Picker ouvert depuis overview** (bottom sheet mobile, modal desktop)
- Session ready avec bouton ✎
- **Picker ouvert depuis session** (bottom sheet mobile, modal desktop)
- Lightbox (si illustration disponible)
- Rest phase

Total : 18 screenshots (6 par viewport)

## Limitations connues

1. **Pas de debounce sur la recherche** : searchExercises() appelé à chaque keystroke
   - Base de données locale, performance OK
   - Possibilité d'ajouter useDeferredValue si nécessaire

2. **Pas de pagination** : limite hard-coded à 12 résultats
   - Suffisant pour la plupart des recherches
   - Possibilité d'ajouter "Charger plus" si nécessaire

3. **Pas de preview hover** : hover scale 1.02 seulement
   - Possibilité d'ajouter lightbox preview sur hover (desktop)

4. **Mapping FR→EN incomplet** : ~30 exercices mappés
   - Fallback : nom français passé tel quel à searchExercises()
   - Résultats anglais retournés quand même (recherche libre)

## Extensions futures possibles

1. **Upload custom image** : permettre upload d'une image perso
2. **Favoris** : marquer des illustrations comme favorites
3. **Historique** : afficher les 5 dernières illustrations choisies
4. **Categories** : filtrer par groupe musculaire (chest, legs, etc.)
5. **Swipe horizontal** : navigation entre frames sur mobile (touch)
6. **Pinch-to-zoom** : zoom sur thumbnail dans le picker
7. **Keyboard shortcuts** : ←/→ pour naviguer entre résultats
8. **Animation spring** : remplacer ease-out par spring physics

## Références

- Composant : `src/components/ImagePicker.tsx`
- Intégrations : `src/components/OverviewScreen.tsx`, `src/components/SessionScreen.tsx`
- Styles : `src/index.css` (lignes ~1150-1430)
- Recherche : `src/utils/illustrations.ts` (`searchExercises`)
- Persistance : `src/hooks/useIllustrations.ts` (`updateExerciseIllustration`)
- Screenshots : `docs/screenshots/ux/*-12-*.png`, `*-14-*.png`
