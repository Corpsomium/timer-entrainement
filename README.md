# Séance — timer d'entraînement

Application web de timer pour séances de musculation, avec support des supersets et illustrations automatiques des exercices. Conçue pour être utilisée sur mobile en salle.

## Fonctionnalités

### Gestion de séance
- Collez un bloc d'exercices, une ligne par mouvement : `Nom : 3x10 (20kg)`
- Les durées du type `3x30s` lancent un compte à rebours d'effort
- Timer de repos configurable (60 s par défaut) avec ajustements ±15 s
- Pas de repos après la dernière série
- Progression sauvegardée automatiquement (localStorage)
- Partage de séance via URL (bloc encodé dans le hash)

### Supersets
Ajoutez un tag de superset à la fin d'une ligne pour grouper des exercices :

```
Pull-apart : 3x15 (bande20) setA
Extensions mollets : 3x15 (20kg) setA
Kickback : 3x10 (7.5kg) setB
Hammer preacher curl 45° : 3x10 (10kg) setB
```

- Les exercices du même groupe s'enchaînent sans repos entre eux
- Le repos intervient après chaque tour complet du groupe
- Si les exercices ont des nombres de séries différents, ceux avec moins de séries quittent les tours suivants
- Les groupes sont affichés visuellement dans l'aperçu

### Illustrations d'exercices
- Base de données publique [free-exercise-db](https://github.com/yuhonas/free-exercise-db)
- Matching automatique français → anglais (fentes arrière → reverse lunge, développé incliné → incline press, etc.)
- Recherche automatique lors du chargement d'un nouveau bloc
- Miniatures dans l'aperçu, images alternées pendant l'exercice
- Historique local avec export/import JSON
- Fichier `public/illustrations.json` pré-rempli avec les exercices courants
- Fonctionne hors ligne si les images sont en cache

### Robustesse
- Timer basé sur timestamp (survit au passage en arrière-plan)
- Wake Lock pour éviter la mise en veille
- Beeps WebAudio et vibrations à la fin des comptes à rebours
- Pas de crash si une ligne est invalide (avertissement affiché)
- Fonctionne hors ligne (PWA ready)

## Format de ligne

```
Nom de l'exercice : SERIESxREPS (poids) [setX]
```

- **Nom** : texte libre
- **SERIES** : nombre de séries (ex: `3`)
- **REPS** : nombre de répétitions (ex: `10`) ou durée (ex: `30s`, `1.5min`)
- **poids** (optionnel) : texte libre entre parenthèses (ex: `20kg`, `2x15kg`, `bande20`)
- **setX** (optionnel) : tag de superset (ex: `setA`, `setB`, `set A` — insensible à la casse)

Exemples valides :
```
Fentes arrière : 3x10 (2x10kg)
Développé incliné : 3x12 (2x15kg)
Pull-apart : 3x15 (bande20) setA
Extensions mollets : 3x15 (20kg) setA
Marches du fermier : 3x30s (2x15kg)
Bird dogs : 2x12
```

## Développement local

### Prérequis
- Node.js 20+
- npm

### Installation
```bash
npm install
```

### Lancement
```bash
npm run dev
```

L'application sera accessible à `http://localhost:5173/timer-entrainement/`

### Tests
```bash
npm test          # Exécuter les tests une fois
npm run test:watch # Mode watch
```

### Build de production
```bash
npm run build
```

Les fichiers statiques seront générés dans `dist/`.

## Déploiement sur GitHub Pages

### Configuration initiale
1. Créez un dépôt public sur GitHub (ex: `timer-entrainement`)
2. Poussez le code sur la branche `main`
3. Allez dans **Settings → Pages**
4. Sous **Build and deployment**, choisissez **Source: GitHub Actions**
5. Le workflow se déclenche automatiquement à chaque push sur `main`

### Workflow automatique
Le fichier `.github/workflows/deploy.yml` :
- S'exécute sur chaque push vers `main`
- Installe les dépendances
- Construit l'application (`npm run build`)
- Déploie le dossier `dist/` sur GitHub Pages

Le site sera accessible à `https://VOTRE-COMPTE.github.io/timer-entrainement/`

### Vérification du déploiement
- Allez dans l'onglet **Actions** du dépôt
- Vérifiez que le workflow s'est exécuté sans erreur
- Le site est en ligne quelques minutes après un push réussi

## Stack technique

- **React 19** avec **TypeScript**
- **Vite** pour le build et le dev server
- **Vitest** pour les tests unitaires
- **CSS vanilla** (pas de framework)
- **WebAudio API** pour les beeps
- **Wake Lock API** pour éviter la mise en veille
- **LocalStorage** pour la persistance
- **free-exercise-db** pour les illustrations

## Structure du projet

```
/
├── .github/
│   └── workflows/
│       └── deploy.yml          # Workflow GitHub Actions
├── public/
│   └── illustrations.json      # Illustrations pré-remplies
├── src/
│   ├── components/
│   │   ├── InputScreen.tsx
│   │   ├── OverviewScreen.tsx
│   │   ├── SessionScreen.tsx
│   │   └── DoneScreen.tsx
│   ├── hooks/
│   │   ├── useSession.ts       # Gestion de l'état de séance
│   │   └── useIllustrations.ts # Gestion des illustrations
│   ├── utils/
│   │   ├── parser.ts           # Parseur de bloc
│   │   ├── sequencer.ts        # Construction de séquence (supersets)
│   │   ├── formatters.ts       # Formatage de texte
│   │   ├── audio.ts            # Beeps et vibrations
│   │   ├── wakeLock.ts         # Wake Lock
│   │   ├── storage.ts          # LocalStorage
│   │   └── illustrations.ts    # Matching FR→EN et recherche
│   ├── types.ts                # Types TypeScript
│   ├── index.css               # Styles globaux
│   ├── App.tsx                 # Composant racine
│   └── main.tsx                # Point d'entrée
├── index.html
├── vite.config.ts              # Config Vite (base path)
├── package.json
└── README.md
```

## Illustrations — exercices pré-remplis

Le fichier `public/illustrations.json` contient les correspondances pour :
- Fentes arrière
- Développé incliné
- Rowing penché
- Hip thrust
- Pull-apart
- Extensions mollets
- Kickback
- Hammer preacher curl
- Bird dogs
- Marches du fermier

Si vous ajoutez de nouveaux exercices, le matching automatique les trouvera. Pour personnaliser ou corriger une correspondance, utilisez la fonctionnalité d'import/export de l'historique (à implémenter dans l'UI si nécessaire).

## Licence

Code source libre. Illustrations issues de [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (domaine public).
