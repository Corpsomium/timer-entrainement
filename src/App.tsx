import { useState, useEffect, startTransition, ViewTransition } from 'react';
import { useSession } from './hooks/useSession';
import { useIllustrations } from './hooks/useIllustrations';
import { InputScreen } from './components/InputScreen';
import { OverviewScreen } from './components/OverviewScreen';
import { SessionScreen } from './components/SessionScreen';
import { DoneScreen } from './components/DoneScreen';
import { shareUrl } from './utils/storage';
import { ensureAudio } from './utils/audio';

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

  const { getIllustration } = useIllustrations(state.exercises);
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
    startTransition(() => {
      loadWorkout();
    });
  };

  const startSessionWithTransition = (resume: boolean) => {
    startTransition(() => {
      startSession(resume);
    });
  };

  const resetSessionWithTransition = () => {
    startTransition(() => {
      resetSession();
    });
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
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
        <ViewTransition default="none" enter="fade-in" exit="fade-out">
          {state.screen === 'input' && (
            <InputScreen state={state} setState={setState} onLoad={loadWorkoutWithTransition} onShare={handleShare} />
          )}
        </ViewTransition>

        <ViewTransition default="none" enter="fade-in" exit="fade-out">
          {state.screen === 'overview' && (
            <OverviewScreen
              state={state}
              setState={setState}
              onStart={() => startSessionWithTransition(false)}
              onResume={() => startSessionWithTransition(true)}
              onShare={handleShare}
              getIllustration={getIllustration}
            />
          )}
        </ViewTransition>

        <ViewTransition default="none" enter="fade-in" exit="fade-out">
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
            />
          )}
        </ViewTransition>

        <ViewTransition default="none" enter="fade-in" exit="fade-out">
          {state.screen === 'done' && (
            <DoneScreen
              state={state}
              setState={setState}
              onRestart={() => startSessionWithTransition(false)}
              onShare={handleShare}
            />
          )}
        </ViewTransition>
      </div>

      <div className={`toast ${toast ? 'show' : ''}`} role="status">
        {toast}
      </div>
    </>
  );
}

export default App;
