import { flushSync } from 'react-dom';

/**
 * Wrapper pour déclencher une view transition native du navigateur
 * avec fallback gracieux pour les navigateurs non supportés.
 * 
 * @param callback Fonction de mise à jour de l'état React
 * @returns Promise qui se résout quand la transition est terminée
 */
export function withViewTransition(callback: () => void): Promise<void> {
  // Vérifier si le navigateur supporte les View Transitions
  if (!document.startViewTransition) {
    // Fallback : exécuter directement sans transition
    callback();
    return Promise.resolve();
  }

  // Utiliser flushSync pour forcer React à appliquer les changements de manière synchrone
  // avant que le navigateur prenne le snapshot "after"
  return document.startViewTransition(() => {
    flushSync(callback);
  }).finished;
}
