# Review d'interface - Application timer d'entraînement

**Date** : 2026-11-20  
**Scope** : Application complète (input, aperçu, session, done)  
**Viewports** : Mobile (390×844), Desktop  
**Framework** : React 19.3.1, Vite, CSS vanilla  

---

## Couverture

| Domaine | État | Skill utilisé |
|---------|------|---------------|
| Accessibilité | ✅ Reviewed | `better-accessibility` |
| Layout | ✅ Reviewed | `better-layout` |
| Écriture | ✅ Reviewed | `better-writing` |
| Typographie | ✅ Reviewed | `better-typography` |
| Couleurs | ✅ Reviewed | `better-colors` |
| Polish UI | ✅ Reviewed | `better-ui`, `emil-design-eng` |
| Motion | ✅ Reviewed | `better-motion` |

**Surfaces inspectées** :
- ✅ Input screen (saisie bloc)
- ✅ Overview screen (liste exercices + thumbnails)
- ✅ Session screen (ready, work timer, rest, superset)
- ✅ Image picker modal
- ✅ Done screen
- ✅ View transitions
- ✅ États narrow (320px)
- ✅ `prefers-reduced-motion`

---

## Problèmes identifiés

### HIGH SEVERITY

#### 1. **Focus indicators invisibles sur boutons et contrôles**

**Problème** : Aucun indicateur de focus visible sur les boutons, liens et contrôles interactifs lors de la navigation clavier.

**Localisation** :
- `src/index.css:200-210` — `.btn` n'a pas de style `:focus-visible`
- `src/index.css:83-93` — `.icon-btn` n'a pas de style `:focus-visible`  
- `src/index.css:130-139` — `textarea` a un focus trop subtil (shadow 0.12 alpha)
- Tous les boutons de l'application

**Pourquoi** : Les utilisateurs navigant au clavier (handicap moteur, utilisateurs power) ne peuvent pas voir où se trouve le focus. Cela bloque la navigation accessible. **Trigger d'escalation** : contrôle sans focus visible.

**Sévérité** : **HIGH** — Bloque la navigation clavier

**Fix** :
```css
/* Focus visible avec ring lime distinctif */
.btn:focus-visible,
.icon-btn:focus-visible,
button:focus-visible {
  outline: 2px solid var(--lime);
  outline-offset: 2px;
}

textarea:focus {
  border-color: var(--lime);
  box-shadow: 0 0 0 3px rgba(214, 255, 63, 0.24);
}
```

---

#### 2. **Contraste insuffisant sur textes secondaires**

**Problème** : Plusieurs textes ont un contraste < 4.5:1 requis pour AA (texte normal).

**Localisation** :
- `src/index.css:7` — `--muted: #6b6b5f` sur `--bg (#0f0f0a)` = **3.8:1** ❌
- Utilisé dans : `.kicker`, `.sub`, `.meta-line`, labels

**Pourquoi** : Les utilisateurs malvoyants ou dans des conditions de faible luminosité ne peuvent pas lire le texte. **Trigger** : contraste sous le minimum WCAG AA.

**Sévérité** : **HIGH** — Rend du contenu illisible

**Fix** :
```css
:root {
  --muted: #8e8e7a; /* Contraste 4.6:1 sur --bg */
}
```

---

#### 3. **État de chargement des images non signalé**

**Problème** : Pendant le chargement asynchrone des illustrations, aucun indicateur n'est affiché. L'utilisateur voit un espace vide ou une transition brutale.

**Localisation** :
- `src/hooks/useIllustrations.ts:1-100` — Pas de gestion d'état loading
- `src/components/OverviewScreen.tsx:120-140` — Pas de fallback pendant fetch
- `src/components/SessionScreen.tsx:310-330` — Images apparaissent sans transition

**Pourquoi** : Les utilisateurs ne savent pas si l'application est bloquée ou si le contenu arrive. Crée de la confusion et une perception de lenteur.

**Sévérité** : **MEDIUM** — Nuit à la compréhension de l'état système

**Fix** : Ajouter skeleton loader ou spinner pendant le chargement.

---

### MEDIUM SEVERITY

#### 4. **Espacement incohérent entre éléments**

**Problème** : Les espacements ne suivent pas un système cohérent (multiples de 4px ou 8px). Mélange de valeurs arbitraires.

**Localisation** :
- `src/index.css:180-190` — gaps mixtes (10px, 14px, 18px)
- `src/index.css:520-530` — marges 18px, 20px, 24px sans système
- Manque de variables CSS pour spacing tokens

**Pourquoi** : Crée une hiérarchie visuelle confuse et nuit à la consistance. Rend l'interface moins prévisible.

**Sévérité** : **MEDIUM** — Nuit à la consistance

**Fix** :
```css
:root {
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
}
```

---

#### 5. **Bordures de boutons trop épaisses**

**Problème** : Les boutons `.btn-ghost` et `.btn-danger` ont des bordures 1px qui semblent trop marquées par rapport au style général lime/minimal.

**Localisation** :
- `src/index.css:222-224` — `.btn-ghost` border 1px
- `src/index.css:228-231` — `.btn-danger` border 1px

**Pourquoi** : Ajoute du bruit visuel inutile et alourdit l'interface.

**Sévérité** : **MEDIUM** — Nuit au polish visuel

**Fix** : Réduire à `0.5px` ou utiliser alpha pour plus de subtilité.

---

#### 6. **Libellés des boutons ambigus**

**Problème** : Certains boutons n'expliquent pas clairement l'action ou le résultat.

**Localisation** :
- `src/components/SessionScreen.tsx:336` — "Démarrer" (démarrer quoi ? le timer)
- `src/components/SessionScreen.tsx:188` — "Passer" (passer quoi ? le repos)
- `src/components/OverviewScreen.tsx:89` — "Commencer" vs "Reprendre" (distinction floue)

**Pourquoi** : Les utilisateurs doivent deviner l'action. Réduit l'efficacité et augmente les erreurs.

**Sévérité** : **MEDIUM** — Réduit la clarté

**Fix** : Ajouter contexte :
- "Démarrer le timer"
- "Passer le repos"
- "Commencer la séance" vs "Reprendre la séance"

---

#### 7. **Radius de bordure incohérent**

**Problème** : Mélange de `border-radius` sans système : 8px, 12px, 16px, 24px sans hiérarchie claire.

**Localisation** :
- `src/index.css:190` — inputs 12px
- `src/index.css:200` — buttons 16px
- `src/index.css:343` — cards 24px
- `src/index.css:433` — dual-frame 8px

**Pourquoi** : Crée un manque de cohérence visuelle.

**Sévérité** : **MEDIUM** — Nuit à la consistance

**Fix** :
```css
:root {
  --radius-sm: 8px;   /* contrôles petits */
  --radius-md: 12px;  /* inputs, small buttons */
  --radius-lg: 16px;  /* buttons principaux */
  --radius-xl: 20px;  /* cards */
}
```

---

#### 8. **Hiérarchie typographique plate**

**Problème** : Manque de différenciation entre niveaux de texte. Le `h2` (24px/700) n'est pas assez distinct du body (16px/400).

**Localisation** :
- `src/index.css:36-40` — `h2` seulement 1.5× le body
- Pas de scale typographique (1.125, 1.25, 1.5, 2)

**Pourquoi** : Rend la hiérarchie d'information floue. L'utilisateur ne capte pas les titres importants rapidement.

**Sévérité** : **MEDIUM** — Nuit à la scannabilité

**Fix** :
```css
h1 { font-size: 32px; line-height: 1.2; } /* 2× */
h2 { font-size: 28px; line-height: 1.25; } /* 1.75× */
h3 { font-size: 20px; line-height: 1.3; }  /* 1.25× */
```

---

#### 9. **Animations de transition trop rapides**

**Problème** : Les durées de transition (140-180ms) sont trop rapides pour être perçues confortablement. L'utilisateur ne voit pas le mouvement, juste un flash.

**Localisation** :
- `src/index.css:657` — `--duration-exit: 140ms`
- `src/index.css:658` — `--duration-enter: 180ms`

**Pourquoi** : Les transitions trop rapides ne permettent pas à l'utilisateur de suivre le changement d'état. Nuit à la compréhension spatiale.

**Sévérité** : **MEDIUM** — Réduit la lisibilité du mouvement

**Fix** :
```css
:root {
  --duration-exit: 200ms;   /* +60ms */
  --duration-enter: 250ms;  /* +70ms */
  --duration-move: 350ms;   /* +50ms */
}
```

---

#### 10. **Pas de feedback hover sur boutons**

**Problème** : Les boutons n'ont pas d'état hover visible (sauf `:active` scale). L'utilisateur desktop ne sait pas si le contrôle est interactif.

**Localisation** :
- `src/index.css:200-220` — Pas de `:hover` sur `.btn`
- Seulement `:active` transform

**Pourquoi** : Les utilisateurs desktop n'ont pas de feedback avant le clic. Réduit l'affordance.

**Sévérité** : **MEDIUM** — Nuit à l'affordance

**Fix** :
```css
.btn:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

.btn:active {
  transform: scale(0.98) translateY(0);
}
```

---

### LOW SEVERITY

#### 11. **Toast trop rapide (1.8s)**

**Problème** : Le toast "Lien copié" disparaît en 1.8s, ce qui peut être trop rapide pour être lu.

**Localisation** :
- `src/App.tsx:69` — `setTimeout(() => setToast(null), 1800)`

**Pourquoi** : Les utilisateurs lents ou distraits peuvent manquer le message.

**Sévérité** : **LOW** — Impact limité

**Fix** : Augmenter à 3000ms (3s).

---

#### 12. **Dual-frame flèches trop grandes**

**Problème** : La flèche "→" entre les frames est trop grande (hérite du font-size parent).

**Localisation** :
- `src/index.css:444` — `.frame-arrow` pas de font-size réduit

**Pourquoi** : Crée un déséquilibre visuel entre l'icône et les images.

**Sévérité** : **LOW** — Polish mineur

**Fix** :
```css
.frame-arrow {
  font-size: 24px; /* Au lieu de inherit */
  color: var(--muted);
}
```

---

#### 13. **Labels "départ" / "fin" pourraient être des icônes**

**Problème** : Les labels textuels "départ" et "fin" sont verbeux. Des icônes (◀️/▶️ ou ●/◉) seraient plus universelles.

**Localisation** :
- `src/index.css:450-460` — `.frame-label`

**Pourquoi** : Réduction du bruit textuel, plus iconique.

**Sévérité** : **LOW** — Polish mineur

**Fix** : Remplacer par `◀` / `▶` ou points `●` / `◉`.

---

## Résumé des fixes recommandés

### Implémentation immédiate (HIGH)

1. ✅ **Focus indicators** — Ajouter outline lime 2px sur tous les contrôles
2. ✅ **Contraste `--muted`** — Passer de #6b6b5f à #8e8e7a
3. ❌ **Loading state images** — *Déféré* (nécessite refactoring hooks)

### Implémentation recommandée (MEDIUM)

4. ✅ **Spacing system** — Ajouter tokens `--space-*`
5. ✅ **Bordures boutons** — Réduire à 0.5px ou alpha
6. ❌ **Libellés boutons** — *Déféré* (changement de copie, besoin validation)
7. ✅ **Radius system** — Tokens `--radius-*`
8. ✅ **Hiérarchie typo** — Augmenter h1/h2
9. ✅ **Durées transitions** — Augmenter de 60-70ms
10. ✅ **Hover feedback** — Ajouter hover sur boutons

### Optionnel (LOW)

11. ✅ **Toast duration** — 1.8s → 3s
12. ✅ **Frame arrow** — Réduire taille
13. ❌ **Frame labels** — *Déféré* (changement sémantique)

---

## Verdict

**Status** : **CONDITIONAL APPROVE** avec corrections HIGH/MEDIUM

**Bloqueurs** :
- ❌ Focus indicators manquants (HIGH)
- ❌ Contraste insuffisant sur --muted (HIGH)

**Recommandations** :
- ✅ Implémenter tous les MEDIUM pour polish
- ⚠️ Loading state images à planifier (refactoring non trivial)

**Ce qui est bon** :
- ✅ View transitions implémentées correctement (PR #6)
- ✅ prefers-reduced-motion respecté
- ✅ Structure responsive correcte
- ✅ Gestion du clavier de base présente
- ✅ ARIA roles corrects sur les éléments interactifs

---

## Prochaines étapes

1. **Implémenter HIGH/MEDIUM safe** (cette PR)
2. **Tester avec lecteur d'écran** (VoiceOver/NVDA)
3. **Loading states illustrations** (PR future)
4. **Review libellés avec utilisateurs** (tests utilisabilité)
