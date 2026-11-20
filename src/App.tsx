import { useState, useEffect } from 'react';
import { useSession } from './hooks/useSession';
import { useIllustrations } from './hooks/useIllustrations';
import { InputScreen } from './components/InputScreen';
import { OverviewScreen } from './components/OverviewScreen';
import { SessionScreen } from './components/SessionScreen';
import { DoneScreen } from './components/DoneScreen';
import { shareUrl } from './utils/storage';
import { ensureAudio } from './utils/audio';
import { withViewTransition } from './utils/viewTransition';

function App() {
  const {
    state,
    setState,
    sequence,
    loadWorkout,
    startSession,
    finishSet,
    finishRest,
    startWorkTimer,
    adjustTimer,
    goBack,
    skipExercise,
    resetSession,
  } = useSession();

  const { getIllustration, updateExerciseIllustration } = useIllustrations(state.exercises);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const unlockAudio = () => {
      ensureAudio();
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
    };

    document.addEventListener('click', unlockAudio);
    document.addEventListener('touchstart', unlockAudio);

    return () => {
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
    };
  }, []);

  const loadWorkoutWithTransition = () => {
    withViewTransition(() => {
      loadWorkout();
    });
  };

  const startSessionWithTransition = (resume: boolean) => {
    withViewTransition(() => {
      startSession(resume);
    });
  };

  const resetSessionWithTransition = () => {
    withViewTransition(() => {
      resetSession();
    });
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleShare = () => {
    const url = shareUrl(state.block);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(url)
        .then(() => showToast('Lien copié'))
        .catch(() => fallbackCopy(url));
    } else {
      fallbackCopy(url);
    }
  };

  const fallbackCopy = (text: string) => {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      showToast('Lien copié');
    } catch (e) {
      showToast("Copiez l'URL dans la barre d'adresse");
    }
    document.body.removeChild(ta);
  };

  return (
    <>
      <div className="wrap">
        {state.screen === 'input' && (
          <InputScreen state={state} setState={setState} onLoad={loadWorkoutWithTransition} onShare={handleShare} />
        )}

        {state.screen === 'overview' && (
          <OverviewScreen
            state={state}
            setState={setState}
            onStart={() => startSessionWithTransition(false)}
            onResume={() => startSessionWithTransition(true)}
            onShare={handleShare}
            getIllustration={getIllustration}
            updateExerciseIllustration={updateExerciseIllustration}
          />
        )}

        {state.screen === 'session' && (
          <SessionScreen
            state={state}
            setState={setState}
            sequence={sequence}
            onCompleteSet={finishSet}
            onStartWork={startWorkTimer}
            onSkipRest={finishRest}
            onAdjustTimer={adjustTimer}
            onBack={goBack}
            onSkipExercise={skipExercise}
            onReset={resetSessionWithTransition}
            getIllustration={getIllustration}
            updateExerciseIllustration={updateExerciseIllustration}
          />
        )}

        {state.screen === 'done' && (
          <DoneScreen
            state={state}
            setState={setState}
            onRestart={() => startSessionWithTransition(false)}
            onShare={handleShare}
          />
        )}
      </div>

      <div className={`toast ${toast ? 'show' : ''}`} role="status">
        {toast}
      </div>
    </>
  );
}

export default App;
